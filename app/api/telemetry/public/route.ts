// Public aggregate telemetry — no auth required.
//
// The landing page is public, so it cannot read the authenticated snapshot.
// This endpoint exposes only pre-aggregated KPIs (no service names, no
// topology) so guests see a living overview while protected pages keep the
// full node/policy detail behind the session check.

import { assertDatabaseConfigured, db, dbErrorDetail } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    assertDatabaseConfigured()
  } catch (err) {
    return Response.json(
      { error: 'Database unavailable', detail: dbErrorDetail(err) },
      { status: 503 },
    )
  }

  try {
    const [nodes, policies] = await Promise.all([
      db.select().from(serviceNodes),
      db.select({ id: shapingPolicies.id, state: shapingPolicies.state }).from(shapingPolicies),
    ])

    const toNumber = (v: string | number) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    const rps = nodes.reduce((sum, n) => sum + toNumber(n.rps), 0)
    const p99 = rps
      ? Math.round(nodes.reduce((sum, n) => sum + toNumber(n.p99) * toNumber(n.rps), 0) / rps)
      : 0
    const active = nodes.filter((n) => n.circuit !== 'open')
    const activeRps = active.reduce((sum, n) => sum + toNumber(n.rps), 0)
    const errorRate = activeRps
      ? Number(
          (
            active.reduce((sum, n) => sum + toNumber(n.errorRate) * toNumber(n.rps), 0) /
            activeRps
          ).toFixed(2),
        )
      : 0
    const peakAnomaly = nodes.length
      ? Math.max(0, ...nodes.map((n) => toNumber(n.anomalyScore)))
      : 0

    return Response.json({
      nodes: [],
      policies: [],
      kpis: {
        rps: Math.round(rps),
        p99,
        errorRate,
        mitigations: nodes.filter((n) => n.circuit !== 'closed').length,
        nodeCount: nodes.length,
        policyCount: policies.length,
        peakAnomaly,
        activePolicies: policies.filter((p) => p.state === 'active').length,
        openCircuits: nodes.filter((n) => n.circuit !== 'closed').length,
        decisionConfidence: Math.round(peakAnomaly),
      },
    })
  } catch (err) {
    // Surface the underlying driver error — invaluable for diagnosing
    // serverless/Neon connectivity issues (connection limits, SSL, allowlists).
    return Response.json(
      { error: 'Database unavailable', detail: dbErrorDetail(err) },
      { status: 503 },
    )
  }
}
