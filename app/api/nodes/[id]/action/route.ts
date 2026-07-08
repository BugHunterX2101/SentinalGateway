// POST /api/nodes/[id]/action
// Body: { action: 'mitigate' | 'snooze' | 'reset' }
// Persists the operator action to Neon via the server action, then also
// applies it to the in-memory sim engine so the SSE stream reflects it immediately.

import { applyNodeAction } from '@/app/actions/nodes'
import { applyNodeAction as simApply } from '@/lib/live-store'

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
    // Persist to Neon (auth-checked inside the action)
    const updated = await applyNodeAction(id, { action: action as (typeof valid)[number] })

    // Also apply to the sim engine so the live SSE stream reflects it instantly
    simApply(id, action as (typeof valid)[number])

    return Response.json({ ok: true, node: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Node not found') return Response.json({ error: message }, { status: 404 })
    return Response.json({ error: message }, { status: 500 })
  }
}
