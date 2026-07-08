'use client'

// Real-time telemetry engine for Sentinel Gateway.
// A single client-side simulation evolves the full gateway state on a fixed
// tick (mean-reverting random walks around realistic baselines, plus injected
// incident events). Every component subscribes through useSyncExternalStore so
// the entire UI reflects one coherent, continuously-updating live stream.

import {
  serviceNodes as seedNodes,
  trafficEdges,
  shapingPolicies as seedPolicies,
  anomalySignals as seedAnomalies,
  type ServiceNode,
  type TrafficEdge,
  type NodeHealth,
  type CircuitState,
  type AnomalySignal,
  type ShapingPolicy,
} from './sentinel-data'

const SERIES_LEN = 48
const TICK_MS = 1500

export interface LivePolicy extends ShapingPolicy {
  load: number // live utilization of the allocated budget, 0-100
}

export interface LiveKpis {
  rps: number
  p99: number
  errorRate: number
  mitigations: number
}

export interface LiveState {
  tick: number
  startedAt: number
  nodes: ServiceNode[]
  edges: TrafficEdge[]
  kpis: LiveKpis
  series: {
    rps: number[]
    latency: number[]
    error: number[]
    mitigations: number[]
  }
  anomalies: AnomalySignal[]
  policies: LivePolicy[]
  decisionConfidence: number
  requestsProtected: number
}

// Immutable baselines captured from the seed data so random walks revert toward
// a realistic center instead of drifting away forever.
const baselines = Object.fromEntries(
  seedNodes.map((n) => [n.id, { rps: n.rps, p99: n.p99, errorRate: n.errorRate }]),
)

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function drift(current: number, base: number, volatility: number, min: number, max: number) {
  const reversion = (base - current) * 0.08
  const noise = (Math.random() - 0.5) * volatility
  return clamp(current + reversion + noise, min, max)
}

function deriveHealth(errorRate: number, p99: number): NodeHealth {
  if (errorRate > 15 || p99 > 650) return 'critical'
  if (errorRate > 2 || p99 > 150) return 'degraded'
  return 'healthy'
}

function deriveCircuit(health: NodeHealth): CircuitState {
  if (health === 'critical') return 'open'
  if (health === 'degraded') return 'half-open'
  return 'closed'
}

function deriveAnomalyScore(errorRate: number, p99: number) {
  const errComponent = clamp((errorRate / 25) * 100, 0, 100)
  const latComponent = clamp((p99 / 1000) * 100, 0, 100)
  return Math.round(clamp(errComponent * 0.6 + latComponent * 0.4, 0, 100))
}

const severityFor = (score: number): AnomalySignal['severity'] =>
  score >= 80 ? 'critical' : score >= 40 ? 'warning' : 'info'

// Incident scheduler: occasionally push a random service into a spike so the
// dashboards show anomaly detection, shaping and circuit-breaking in action.
let incident: { nodeId: string; ticksLeft: number; magnitude: number } | null = null

function maybeScheduleIncident(nodes: ServiceNode[]) {
  if (incident) return
  if (Math.random() < 0.12) {
    const candidate = nodes[Math.floor(Math.random() * nodes.length)]
    incident = {
      nodeId: candidate.id,
      ticksLeft: 6 + Math.floor(Math.random() * 8),
      magnitude: 1 + Math.random() * 1.5,
    }
  }
}

function initState(): LiveState {
  const nodes = seedNodes.map((n) => ({ ...n }))
  return {
    tick: 0,
    startedAt: Date.now(),
    nodes,
    edges: trafficEdges.map((e) => ({ ...e })),
    kpis: aggregate(nodes),
    series: {
      rps: seedSeries(48.2, 6),
      latency: seedSeries(132, 40),
      error: seedSeries(5.1, 3),
      mitigations: seedSeries(3, 1),
    },
    anomalies: seedAnomalies.map((a) => ({ ...a })),
    policies: seedPolicies.map((p, i) => ({
      ...p,
      load: clamp(p.budget * (0.6 + ((i * 7) % 5) * 0.06), 0, 100),
    })),
    decisionConfidence: 96,
    requestsProtected: 312000,
  }
}

// Deterministic seed so the server-rendered tick-0 snapshot matches the client's
// first render (avoids hydration mismatches). The live timer only starts after mount.
function seedSeries(center: number, spread: number) {
  return Array.from({ length: SERIES_LEN }, (_, i) => {
    const wave = Math.sin(i * 0.5) * 0.5 + Math.cos(i * 0.23) * 0.3
    return clamp(center + wave * spread, 0, center * 4)
  })
}

function aggregate(nodes: ServiceNode[]): LiveKpis {
  const totalRps = nodes.reduce((s, n) => s + n.rps, 0)
  const weightedP99 = nodes.reduce((s, n) => s + n.p99 * n.rps, 0) / totalRps
  const weightedErr = nodes.reduce((s, n) => s + n.errorRate * n.rps, 0) / totalRps
  const mitigations = nodes.filter((n) => n.circuit !== 'closed').length
  return {
    rps: Math.round(totalRps),
    p99: Math.round(weightedP99),
    errorRate: Number(weightedErr.toFixed(2)),
    mitigations,
  }
}

let state = initState()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function step() {
  const prevHealth = Object.fromEntries(state.nodes.map((n) => [n.id, n.health]))
  maybeScheduleIncident(state.nodes)

  const nodes = state.nodes.map((n) => {
    const base = baselines[n.id]
    const underIncident = incident?.nodeId === n.id
    const mag = underIncident ? incident!.magnitude : 1

    const rps = drift(n.rps, base.rps, base.rps * 0.05, base.rps * 0.4, base.rps * 1.6)
    const p99 = drift(
      n.p99,
      underIncident ? base.p99 * (3 + mag) : base.p99,
      underIncident ? 120 : Math.max(6, base.p99 * 0.12),
      8,
      1400,
    )
    const errorRate = drift(
      n.errorRate,
      underIncident ? base.errorRate + 18 * mag : base.errorRate,
      underIncident ? 4 : 0.4,
      0,
      45,
    )
    const health = deriveHealth(errorRate, p99)
    return {
      ...n,
      rps: Math.round(rps),
      p99: Math.round(p99),
      errorRate: Number(errorRate.toFixed(2)),
      anomalyScore: deriveAnomalyScore(errorRate, p99),
      health,
      circuit: deriveCircuit(health),
    }
  })

  if (incident) {
    incident.ticksLeft -= 1
    if (incident.ticksLeft <= 0) incident = null
  }

  const kpis = aggregate(nodes)

  // Edges inherit status from their downstream node's health.
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges = state.edges.map((e) => {
    const dst = nodeById[e.to]
    let status: TrafficEdge['status'] = 'nominal'
    if (dst) {
      if (dst.circuit === 'open') status = 'severed'
      else if (dst.health === 'degraded') status = dst.p99 > 250 ? 'throttled' : 'shaped'
    }
    return { ...e, latency: dst ? dst.p99 : e.latency, status }
  })

  // Generate anomaly-feed entries when a node's health degrades.
  const now = Date.now()
  const newAnomalies: AnomalySignal[] = []
  for (const n of nodes) {
    const worsened =
      (prevHealth[n.id] === 'healthy' && n.health !== 'healthy') ||
      (prevHealth[n.id] === 'degraded' && n.health === 'critical')
    if (worsened) {
      newAnomalies.push({
        id: `anm-${now.toString().slice(-6)}-${n.id}`,
        service: n.id,
        serviceLabel: n.name,
        metric: n.errorRate > 8 ? 'Error rate' : 'p99 latency',
        baseline: n.errorRate > 8 ? `${baselines[n.id].errorRate}%` : `${baselines[n.id].p99}ms`,
        observed: n.errorRate > 8 ? `${n.errorRate}%` : `${n.p99}ms`,
        severity: severityFor(n.anomalyScore),
        confidence: n.anomalyScore,
        detectedAt: now,
        action:
          n.health === 'critical'
            ? 'Circuit opened, failing over to retry buffer'
            : 'Adaptive shaping: shedding low-priority traffic',
      }) as unknown as AnomalySignal
    }
  }
  const anomalies = [...newAnomalies, ...state.anomalies].slice(0, 8)

  // Policy live load tracks the health of its target region.
  const policies = state.policies.map((p) => {
    const stress = kpis.errorRate > 6 || kpis.p99 > 200 ? 1.15 : 1
    const load = clamp(drift(p.load, p.budget * 0.7 * stress, 6, 0, 100), 0, 100)
    return { ...p, load: Math.round(load) }
  })

  const decisionConfidence = clamp(
    Math.round(88 + (nodes.find((n) => n.id === 'payments')?.anomalyScore ?? 0) * 0.08),
    80,
    99,
  )

  state = {
    ...state,
    tick: state.tick + 1,
    nodes,
    edges,
    kpis,
    series: {
      rps: [...state.series.rps.slice(1), kpis.rps / 1000],
      latency: [...state.series.latency.slice(1), kpis.p99],
      error: [...state.series.error.slice(1), kpis.errorRate],
      mitigations: [...state.series.mitigations.slice(1), kpis.mitigations],
    },
    anomalies,
    policies,
    decisionConfidence,
    requestsProtected: state.requestsProtected + Math.round(kpis.rps * (TICK_MS / 1000)),
  }

  for (const l of listeners) l()
}

function ensureRunning() {
  if (timer || typeof window === 'undefined') return
  timer = setInterval(step, TICK_MS)
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  ensureRunning()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function getSnapshot() {
  return state
}

// Frozen tick-0 snapshot captured once. Used as the SSR/first-hydration snapshot so
// the server and client render identically; the live timer only mutates `state`.
const initialSnapshot = state
export function getInitialSnapshot() {
  return initialSnapshot
}
