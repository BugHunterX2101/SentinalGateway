// POST /api/nodes/[id]/action
// Body: { action: 'mitigate' | 'snooze' | 'reset' }
// Applies an operator action to the specified service node. In this simulation
// the store mutates the node's anomaly score and circuit state in response.

import { applyNodeAction } from '@/lib/live-store'

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

  const result = applyNodeAction(id, action as (typeof valid)[number])
  if (!result) {
    return Response.json({ error: `Node '${id}' not found` }, { status: 404 })
  }

  return Response.json({ ok: true, node: result })
}
