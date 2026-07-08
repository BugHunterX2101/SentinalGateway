// Real-time Server-Sent Events stream for Sentinel Gateway telemetry.
// Clients subscribe and receive a JSON-serialised LiveState snapshot on every
// 1.5-second tick from the shared live-store engine.

import { subscribe, getSnapshot } from '@/lib/live-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Immediately send the current snapshot so the client doesn't wait.
      const send = () => {
        try {
          const data = JSON.stringify(getSnapshot())
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Client disconnected — the unsubscribe below will clean up.
        }
      }

      send()
      const unsubscribe = subscribe(() => {
        send()
      })

      // Clean up when the connection closes.
      // ReadableStream cancel is called when the client disconnects.
      return () => {
        unsubscribe()
      }
    },
    cancel() {
      // Called on client disconnect; ReadableStream already called the cleanup
      // returned from start(), so nothing extra required here.
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
