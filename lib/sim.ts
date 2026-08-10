// Live simulation engine for the Sentinel Gateway control plane.
//
// The telemetry stream is read-only on its own; without a writer nothing ever
// changes and no decisions are ever produced. This module gives the demo a
// "nervous system": on every SSE tick it evolves each service's metrics,
// occasionally pushes a node into an incident (which triggers a full
// SENSE → DECIDE → ACT → EXPLAIN decision with an audit entry), then lets the
// node self-heal back to its baseline.
//
// Concurrency: multiple SSE clients can tick at the same time. Every write is
// a conditional UPDATE guarded by `updated_at` staleness, so at most one
// writer per ~1.2s window wins per node/policy — no advisory locks needed.

import { and, eq, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { serviceNodes, shapingPolicies, decisions, decisionSteps, auditLog } from '@/lib/db/schema'
import { BASELINES, baselineFor, type NodeBaseline } from '@/lib/baselines'

const TICK_MS = 1500

// Nodes may only be simulated if nothing has touched them for this long.
// Keeps operator actions stable for at least one full tick.
const STALENESS_MS = 1200

const INCIDENT_BUCKET_SEC = 240 // a node can enter an incident at most every 4 minutes
const INCIDENT_DURATION_SEC = 75 // how long an incident lasts before self-healing
const DECISION_COOLDOWN_MS = 4 * 60_000 // one decision per node per 4 minutes
const MAX_DECISIONS = 300
const MAX_AUDIT = 1000

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function wave(nowSec: number, period: number, phase: number, amp: number) {
  return 1 + amp * Math.sin((nowSec / period) * Math.PI * 2 + phase)
}

interface IncidentInfo {
  active: boolean
  progress: number // 0 at incident start → 1 at recovery
  severity: number // 1 at start → 0 at recovery
  incidentStartSec: number
}

function incidentFor(nodeId: string, nowSec: number): IncidentInfo {
  const seed = hashString(nodeId)
  const bucket = Math.floor(nowSec / INCIDENT_BUCKET_SEC)
  const triggered = (seed + bucket) % 5 === 0
  const incidentStartSec = bucket * INCIDENT_BUCKET_SEC
  const elapsed = nowSec - incidentStartSec
  const active = triggered && elapsed < INCIDENT_DURATION_SEC
  const progress = active ? elapsed / INCIDENT_DURATION_SEC : 1
  return {
    active,
    progress,
    severity: active ? 1 - progress : 0,
    incidentStartSec,
  }
}

function nextNodeValues(nodeId: string, base: NodeBaseline, nowSec: number) {
  const seed = hashString(nodeId)
  const incident = incidentFor(nodeId, nowSec)
  const baseRps = Number(base.rps)
  const baseP99 = Number(base.p99)
  const baseErr = Number(base.errorRate)

  // Steady-state drift around the baseline — looks alive without noise spikes.
  const rps = Math.round(baseRps * wave(nowSec, 180, seed * 0.7, 0.09))
  const p99 = Math.round(baseP99 * wave(nowSec, 240, seed * 1.3, 0.08))
  const errorRate = round1(baseErr * wave(nowSec, 300, seed, 0.2))

  if (!incident.active) {
    return {
      rps,
      p99,
      errorRate,
      anomalyScore: Math.round(Math.random() * 12),
      health: 'healthy' as const,
      circuit: 'closed' as const,
      incident,
    }
  }

  // Incident: metrics spike hard, then decay as the node self-heals.
  const s = incident.severity
  return {
    rps: Math.round(rps * (1 + 0.25 * s)),
    p99: Math.round(baseP99 * (2.2 - 1.0 * s)),
    errorRate: round1(baseErr + 3.5 + 4 * s),
    anomalyScore: Math.round(40 + 55 * s),
    health: (s > 0.55 ? 'critical' : 'degraded') as 'critical' | 'degraded',
    circuit: (s > 0.5 ? 'open' : s > 0.18 ? 'half-open' : 'closed') as
      | 'open'
      | 'half-open'
      | 'closed',
    incident,
  }
}

function nextPolicyLoad(policyId: string, nowSec: number, paused: boolean) {
  const seed = hashString(policyId)
  if (paused) return 0
  const base = 25 + (seed % 30) // 25–54% base load per policy
  const load = Math.round(base * wave(nowSec, 200, seed, 0.35) + Math.random() * 6)
  return clamp(load, 2, 99)
}

async function createDecisionForIncident(nodeId: string, nowSec: number): Promise<void> {
  const cutoff = new Date(Date.now() - DECISION_COOLDOWN_MS)
  const [recent] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.nodeId, nodeId), sql`${decisions.createdAt} > ${cutoff}`))
    .limit(1)
  if (recent) return

  const [node] = await db.select().from(serviceNodes).where(eq(serviceNodes.id, nodeId))
  if (!node) return
  const seed = hashString(nodeId)
  const incident = incidentFor(nodeId, nowSec)
  const metric =
    Number(node.errorRate) >= 3
      ? 'error rate'
      : Number(node.p99) >= 90
        ? 'p99 latency'
        : 'request volume'
  const multiplier =
    metric === 'p99 latency'
      ? (Number(node.p99) / Math.max(1, Number(BASELINES[nodeId]?.p99 ?? 1))).toFixed(1)
      : metric === 'error rate'
        ? (Number(node.errorRate) / Math.max(0.1, Number(BASELINES[nodeId]?.errorRate ?? 1))).toFixed(1)
        : null

  const headline =
    metric === 'p99 latency'
      ? `${node.name} p99 latency spiked ${multiplier}× above seasonal baseline`
      : metric === 'error rate'
        ? `${node.name} error rate exceeded adaptive threshold (${Number(node.errorRate).toFixed(1)}% observed)`
        : `${node.name} request volume deviated from learned seasonal envelope`

  const confidence = 82 + (seed % 15) // 82–96
  const id = `dec-${Date.now().toString(36)}-${seed.toString(36)}`
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx.insert(decisions).values({
      id,
      nodeId,
      headline,
      outcome: 'Contained',
      confidence: String(confidence),
      latencyToDecide: `${150 + (seed % 200)}ms`,
      model: 'SentinelBrain-v3 · half-space tree ensemble',
      requestsProtected: Math.round(Number(node.rps) * 45).toLocaleString('en-US'),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    const rps = Number(node.rps)
    const steps = [
      {
        phase: 'sense',
        label: 'Seasonal deviation detected',
        detail: `${node.name} deviated from its learned envelope: ${Number(node.p99)}ms p99, ${Number(node.errorRate)}% error rate, ${rps.toLocaleString('en-US')} rps observed.`,
        confidence: String(confidence),
        deltaMs: 30 + (seed % 40),
      },
      {
        phase: 'decide',
        label: 'Blast radius estimated',
        detail: `${node.name} serves ${node.upstream?.length ?? 0} downstream consumers. Estimated blast radius: 1 service. Smallest safe intervention selected.`,
        confidence: String(Math.max(70, confidence - 8)),
        deltaMs: 60 + (seed % 60),
      },
      {
        phase: 'act',
        label: 'Circuit opened + load shed',
        detail: `Opened the ${node.name} circuit and shed low-priority traffic to protect the critical path.`,
        confidence: String(confidence),
        deltaMs: 50 + (seed % 50),
      },
      {
        phase: 'explain',
        label: 'Trace persisted',
        detail: 'Decision and reasoning trace written to audit log. Operator review requested.',
        confidence: '99',
        deltaMs: 90 + (seed % 80),
      },
    ]
    for (const [i, s] of steps.entries()) {
      await tx.insert(decisionSteps).values({
        decisionId: id,
        stepIndex: i,
        phase: s.phase,
        label: s.label,
        detail: s.detail,
        confidence: s.confidence,
        deltaMs: s.deltaMs,
      })
    }

    await tx.insert(auditLog).values({
      type: 'mitigation',
      actor: 'sentinel',
      subject: node.name,
      detail: `Automated mitigation: ${node.name} circuit opened after ${metric} exceeded adaptive threshold.`,
    })
  })

  // Keep the tables bounded — prune the oldest rows.
  await db
    .delete(decisions)
    .where(
      sql`${decisions.id} NOT IN (SELECT id FROM decisions ORDER BY created_at DESC LIMIT ${MAX_DECISIONS})`,
    )
  await db
    .delete(auditLog)
    .where(
      sql`${auditLog.id} NOT IN (SELECT id FROM audit_log ORDER BY created_at DESC LIMIT ${MAX_AUDIT})`,
    )
}

// Returns true if any node was actually simulated this tick (i.e. this caller
// won the staleness race for at least one row).
export async function simulateTick(): Promise<boolean> {
  const nowSec = Date.now() / 1000
  const cutoff = new Date(Date.now() - STALENESS_MS)

  const nodes = await db.select().from(serviceNodes)
  let simulatedAny = false

  for (const node of nodes) {
    const base = baselineFor(node.id)
    if (!base) continue

    // Operator "snooze" holds the node out of the incident engine: metrics
    // keep flowing around the baseline but health/circuit/anomaly stay as the
    // operator left them until the hold expires.
    const snoozed = !!node.snoozedUntil && node.snoozedUntil.getTime() > Date.now()

    if (snoozed) {
      const drift = nextNodeValues(node.id, base, nowSec)
      await db
        .update(serviceNodes)
        .set({
          rps: String(drift.rps),
          p99: String(drift.p99),
          errorRate: String(drift.errorRate),
          anomalyScore: '0',
          updatedAt: new Date(),
        })
        .where(and(eq(serviceNodes.id, node.id), lte(serviceNodes.updatedAt, cutoff)))
      continue
    }

    const next = nextNodeValues(node.id, base, nowSec)
    const [updated] = await db
      .update(serviceNodes)
      .set({
        rps: String(next.rps),
        p99: String(next.p99),
        errorRate: String(next.errorRate),
        anomalyScore: String(next.anomalyScore),
        health: next.health,
        circuit: next.circuit,
        snoozedUntil: null,
        updatedAt: new Date(),
      })
      .where(and(eq(serviceNodes.id, node.id), lte(serviceNodes.updatedAt, cutoff)))
      .returning({ id: serviceNodes.id })

    if (updated) simulatedAny = true

    // First tick inside an incident window → write the decision + audit entry.
    if (next.incident.active && nowSec - next.incident.incidentStartSec < TICK_MS / 1000 + 0.5) {
      await createDecisionForIncident(node.id, nowSec)
    }
  }

  // Evolve policy load so the Flow Canvas utilization bars stay alive.
  const policies = await db.select().from(shapingPolicies)
  for (const policy of policies) {
    const load = nextPolicyLoad(policy.id, nowSec, policy.state === 'paused')
    const [updated] = await db
      .update(shapingPolicies)
      .set({ load: String(load), updatedAt: new Date() })
      .where(and(eq(shapingPolicies.id, policy.id), lte(shapingPolicies.updatedAt, cutoff)))
      .returning({ id: shapingPolicies.id })
    if (updated) simulatedAny = true
  }

  return simulatedAny
}
