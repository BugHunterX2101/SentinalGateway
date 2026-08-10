// Real-time Server-Sent Events stream for Sentinel Gateway telemetry.
// On every tick it (1) advances the live simulation — evolving node metrics,
// self-healing circuits, and generating auditable decisions — then (2) reads
// the current topology from Neon and streams it to all subscribed clients.

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db, dbErrorDetail } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'
import { policyVisibility } from '@/lib/db/visibility'
import { simulateTick } from '@/lib/sim'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TICK_MS = 1500

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id

  try {
    assertDatabaseConfigured()
  } catch (err) {
    return Response.json(
      { error: 'Database unavailable', detail: dbErrorDetail(err) },
      { status: 503 },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let alive = true

      req.signal.addEventListener('abort', () => {
        alive = false
        controller.close()
      })

      async function tick() {
        if (!alive) return
        try {
          // Advance the demo's nervous system before reading state. The
          // staleness guard inside simulateTick means only one writer per
          // tick window wins, so multiple open streams never fight.
          await simulateTick()

          const [nodes, policies] = await Promise.all([
            db.select().from(serviceNodes),
            db.select().from(shapingPolicies).where(policyVisibility(userId)),
          ])

          const payload = JSON.stringify({ nodes, policies })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        } catch {
          // Transient DB error — skip this tick, do not close the stream.
        }
      }

      // Immediate first tick.
      await tick()

      // Subsequent ticks at TICK_MS interval.
      while (alive) {
        await new Promise((res) => setTimeout(res, TICK_MS))
        await tick()
      }
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
