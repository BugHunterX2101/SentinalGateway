// Sentinel Gateway seed script.
//
// Populates an empty Neon database with the demo service mesh, a few global
// shaping policies, sample automated decisions with full step traces, and a
// small audit history so every page of the control plane has data to show.
//
// Idempotent: service nodes are upserted by id, policies/decisions/audit rows
// are inserted only if their fixed ids are not already present.
//
// Usage:
//   node scripts/seed.mjs
//   # or: pnpm seed

import { Pool } from 'pg'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Load .env.local (same loader as scripts/check-neon-schema.mjs)
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue
    const [, key, rawValue] = match
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2')
    process.env[key] = value
  }
}

// Same resolution as lib/db: DATABASE_URL_1 is preferred when set (Vercel's
// "Add another" flow creates suffixed names), falling back to DATABASE_URL.
const connectionString = process.env.DATABASE_URL_1 || process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL (or DATABASE_URL_1) is required (set it in .env.local)')
  process.exit(1)
}

const pool = new Pool({ connectionString })

// ---------------------------------------------------------------------------
// Service node baselines — must stay in sync with lib/baselines.ts
// ---------------------------------------------------------------------------
const NODES = [
  { id: 'edge',      name: 'Edge Gateway',     layer: 'Edge',     rps: '48200', p99: '34',  err: '0.12', upstream: ['authz', 'catalog'] },
  { id: 'authz',     name: 'Auth Service',     layer: 'Auth',     rps: '22400', p99: '41',  err: '0.21', upstream: ['edge'] },
  { id: 'catalog',   name: 'Catalog Service',  layer: 'Core',     rps: '18900', p99: '58',  err: '0.4',  upstream: ['edge'] },
  { id: 'search',    name: 'Search Service',   layer: 'Core',     rps: '15600', p99: '60',  err: '0.5',  upstream: ['catalog'] },
  { id: 'cart',      name: 'Cart Service',     layer: 'Core',     rps: '9800',  p99: '62',  err: '0.6',  upstream: ['authz'] },
  { id: 'payments',  name: 'Payments Service', layer: 'Critical', rps: '9200',  p99: '48',  err: '0.4',  upstream: ['cart'] },
  { id: 'inventory', name: 'Inventory Sync',   layer: 'Data',     rps: '7100',  p99: '31',  err: '0.3',  upstream: ['catalog'] },
  { id: 'notify',    name: 'Notifications',    layer: 'Data',     rps: '5400',  p99: '22',  err: '0.1',  upstream: ['edge'] },
]

const POLICIES = [
  {
    id: 'pol-checkout',
    name: 'Checkout Protection',
    target: 'Cart → Payments',
    strategy: 'Priority lane + retry budget',
    priority: 'critical',
    budget: '80',
    state: 'active',
    load: '42',
  },
  {
    id: 'pol-search',
    name: 'Search Fair Queue',
    target: 'Edge → Search',
    strategy: 'Weighted fair queueing',
    priority: 'high',
    budget: '70',
    state: 'active',
    load: '38',
  },
  {
    id: 'pol-catalog',
    name: 'Catalog Burst Absorber',
    target: 'Edge → Catalog',
    strategy: 'Token-bucket smoothing',
    priority: 'medium',
    budget: '65',
    state: 'learning',
    load: '21',
  },
]

const DECISIONS = [
  {
    id: 'dec-seed-payments',
    nodeId: 'payments',
    headline: 'Payments p99 latency spiked 4.1× above seasonal baseline',
    outcome: 'Contained',
    confidence: '94',
    latency: '312ms',
    model: 'SentinelBrain-v3 · half-space tree ensemble',
    requestsProtected: '18,400',
    status: 'approved',
    ageMinutes: 55,
    steps: [
      { phase: 'sense',   label: 'Seasonal deviation detected',    detail: 'Payments p99 crossed 3.2σ over its learned envelope (48ms baseline → 198ms observed).', confidence: '96', deltaMs: 41 },
      { phase: 'decide',  label: 'Blast radius estimated',          detail: 'Payments serves the checkout flow; 2 downstream consumers. Estimated blast radius: 1 service.', confidence: '91', deltaMs: 87 },
      { phase: 'act',     label: 'Circuit opened + load shed',      detail: 'Opened the Payments circuit and shed 30% of non-checkout traffic to protect revenue-critical path.', confidence: '94', deltaMs: 63 },
      { phase: 'explain', label: 'Trace persisted',                 detail: 'Decision and reasoning trace written to audit log. Operator review requested.', confidence: '99', deltaMs: 121 },
    ],
  },
  {
    id: 'dec-seed-inventory',
    nodeId: 'inventory',
    headline: 'Inventory sync error rate exceeded adaptive threshold',
    outcome: 'Contained',
    confidence: '88',
    latency: '264ms',
    model: 'SentinelBrain-v3 · seasonal envelope model',
    requestsProtected: '7,900',
    status: 'approved',
    ageMinutes: 210,
    steps: [
      { phase: 'sense',   label: 'Error ratio anomaly flagged',     detail: 'Inventory sync error rate rose to 4.2% against a 0.3% learned baseline.', confidence: '89', deltaMs: 38 },
      { phase: 'decide',  label: 'Minimum footprint selected',      detail: 'Ranked interventions; throttling the sync client contained the blast radius to the batch job.', confidence: '86', deltaMs: 74 },
      { phase: 'act',     label: 'Sync client throttled',           detail: 'Reduced sync throughput to 30% and queued backlog with graceful Retry-After.', confidence: '88', deltaMs: 59 },
      { phase: 'explain', label: 'Trace persisted',                 detail: 'Decision trace written to audit log. Operator review requested.', confidence: '99', deltaMs: 93 },
    ],
  },
  {
    id: 'dec-seed-cart',
    nodeId: 'cart',
    headline: 'Cart traffic burst from checkout retry storm',
    outcome: 'Rolled back',
    confidence: '72',
    latency: '198ms',
    model: 'SentinelBrain-v3 · half-space tree ensemble',
    requestsProtected: '12,300',
    status: 'rolled_back',
    ageMinutes: 390,
    steps: [
      { phase: 'sense',   label: 'Request-rate deviation detected', detail: 'Cart request rate exceeded 2.4σ of its diurnal envelope during a known promotion window.', confidence: '74', deltaMs: 35 },
      { phase: 'decide',  label: 'Low-confidence warning',          detail: 'Confidence below 80%; flagged as warning and escalated to operator rather than auto-acting.', confidence: '72', deltaMs: 66 },
      { phase: 'act',     label: 'Light mitigation applied',        detail: 'Shed 10% of retry traffic to stabilise the burst.', confidence: '70', deltaMs: 48 },
      { phase: 'explain', label: 'Trace persisted',                 detail: 'Operator reviewed and rolled back; cart restored to baseline.', confidence: '99', deltaMs: 49 },
    ],
  },
]

const AUDIT_ENTRIES = [
  { type: 'mitigation', actor: 'sentinel', subject: 'Payments Service', detail: 'Automated mitigation: Payments circuit opened after p99 latency exceeded adaptive threshold.' },
  { type: 'decision', actor: 'operator', subject: 'Payments p99 latency spiked 4.1× above seasonal baseline', detail: 'Operator approved automated mitigation.' },
  { type: 'policy', actor: 'operator', subject: 'Checkout Protection', detail: 'Policy created: Priority lane + retry budget for Cart → Payments.' },
  { type: 'decision', actor: 'operator', subject: 'Cart traffic burst from checkout retry storm', detail: 'Operator rolled back mitigation — Cart circuit reset to closed.' },
]

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── service_nodes (upsert) ──────────────────────────────────────────────
    for (const n of NODES) {
      await client.query(
        `INSERT INTO service_nodes (id, name, layer, health, circuit, rps, p99, error_rate, anomaly_score, upstream, updated_at)
         VALUES ($1, $2, $3, 'healthy', 'closed', $4, $5, $6, '0', $7, now())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           layer = EXCLUDED.layer,
           rps = EXCLUDED.rps,
           p99 = EXCLUDED.p99,
           error_rate = EXCLUDED.error_rate,
           upstream = EXCLUDED.upstream`,
        [n.id, n.name, n.layer, n.rps, n.p99, n.err, n.upstream],
      )
    }
    console.log(`Seeded ${NODES.length} service nodes`)

    // ── shaping_policies (insert-if-missing, global demo policies) ─────────
    let policiesCreated = 0
    for (const p of POLICIES) {
      const res = await client.query(
        `INSERT INTO shaping_policies (id, name, target, strategy, budget, priority, state, load, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'operator', now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.target, p.strategy, p.budget, p.priority, p.state, p.load],
      )
      if (res.rowCount === 1) policiesCreated++
    }
    console.log(`Seeded ${policiesCreated} shaping policies (global demo lanes)`)

    // ── decisions + decision_steps (insert-if-missing) ─────────────────────
    let decisionsCreated = 0
    for (const d of DECISIONS) {
      const res = await client.query(
        `INSERT INTO decisions (id, node_id, headline, outcome, confidence, latency_to_decide, model, requests_protected, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - ($10 || ' minutes')::interval, now() - ($10 || ' minutes')::interval)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.nodeId, d.headline, d.outcome, d.confidence, d.latency, d.model, d.requestsProtected, d.status, d.ageMinutes],
      )
      if (res.rowCount === 1) {
        for (const [i, s] of d.steps.entries()) {
          await client.query(
            `INSERT INTO decision_steps ("decisionId", "stepIndex", phase, label, detail, confidence, "deltaMs")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [d.id, i, s.phase, s.label, s.detail, s.confidence, s.deltaMs],
          )
        }
        decisionsCreated++
      }
    }
    console.log(`Seeded ${decisionsCreated} decisions with step traces`)

    // ── audit_log (insert-if-missing via deterministic detail) ─────────────
    let auditCreated = 0
    for (const a of AUDIT_ENTRIES) {
      const res = await client.query(
        `INSERT INTO audit_log (type, actor, subject, detail, created_at)
         SELECT $1, $2, $3, $4, now() - (random() * interval '2 days')
         WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE detail = $4)`,
        [a.type, a.actor, a.subject, a.detail],
      )
      if (res.rowCount === 1) auditCreated++
    }
    console.log(`Seeded ${auditCreated} audit entries`)

    await client.query('COMMIT')
    console.log('\nSeed complete. Open the control plane and watch the simulation take over.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
