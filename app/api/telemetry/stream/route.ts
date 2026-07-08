// Real-time Server-Sent Events stream for Sentinel Gateway telemetry.
// Merges the in-memory simulation engine (animated KPIs, series) with durable
// node health/circuit state and policies read from Neon on every tick.

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'
import { subscribe, getSnapshot } from '@/lib/live-store'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      async function send() {
        try {
          const [dbNodes, dbPolicies] = await Promise.all([
            db.select().from(serviceNodes),
            db.select().from(shapingPolicies),
          ])

          const simSnapshot = getSnapshot()

          // Apply durable DB overrides (health, circuit, anomalyScore) onto
          // the simulation snapshot so operator mutations survive page reloads.
          const mergedNodes = simSnapshot.nodes.map((simNode) => {
            const dbNode = dbNodes.find((n) => n.id === simNode.id)
            if (!dbNode) return simNode
            return {
              ...simNode,
              health: dbNode.health as typeof simNode.health,
              circuit: dbNode.circuit as typeof simNode.circuit,
              anomalyScore: Number(dbNode.anomalyScore),
            }
          })

          const payload = JSON.stringify({
            ...simSnapshot,
            nodes: mergedNodes,
            policies: dbPolicies.map((p) => ({
              id: p.id,
              name: p.name,
              target: p.target,
              strategy: p.strategy,
              budget: Number(p.budget),
              priority: p.priority,
              state: p.state,
              load: Number(p.load),
            })),
          })

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        } catch {
          // Transient DB error — skip this tick, do not close the stream.
        }
      }

      // Immediate first send, then follow sim-engine ticks.
      await send()
      const unsubscribe = subscribe(() => { send() })

      req.signal.addEventListener('abort', () => {
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
