// POST /api/nodes/[id]/action
// Body: { action: 'mitigate' | 'snooze' | 'reset' }
// Persists the operator action to Neon. The SSE stream will reflect the
// updated node state on the next DB tick.

import { applyNodeAction } from '@/app/actions/nodes'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = (body as { action?: string }).action ?? 'mitigate'

  const valid = ['mitigate', 'snooze', 'reset'] as const
  if (!valid.includes(action as (typeof valid)[number])) {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    const updated = await applyNodeAction(id, { action: action as (typeof valid)[number] })
    return Response.json({ ok: true, node: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Node not found') return Response.json({ error: message }, { status: 404 })
    return Response.json({ error: message }, { status: 500 })
  }
}
