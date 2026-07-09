// Real-time Server-Sent Events stream for Sentinel Gateway telemetry.
// Reads current node health and policy state from Neon on every tick and
// streams a JSON payload to all subscribed clients.

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TICK_MS = 1500

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    assertDatabaseConfigured()
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database unavailable' },
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
          const [nodes, policies] = await Promise.all([
            db.select().from(serviceNodes),
            db.select().from(shapingPolicies),
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
