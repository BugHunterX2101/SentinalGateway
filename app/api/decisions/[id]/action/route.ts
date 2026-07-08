// POST /api/decisions/[id]/action
// Body: { action: 'approve' | 'rollback' }
// Approve keeps the current mitigation active; rollback restores the prior state
// and resets the circuit breaker for the affected service.

import { applyDecisionAction } from '@/lib/live-store'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = (body as { action?: string }).action ?? 'approve'

  const valid = ['approve', 'rollback'] as const
  if (!valid.includes(action as (typeof valid)[number])) {
    return Response.json({ error: 'Invalid action. Use approve or rollback.' }, { status: 400 })
  }

  const result = applyDecisionAction(id, action as (typeof valid)[number])
  if (!result) {
    return Response.json({ error: `Decision '${id}' not found` }, { status: 404 })
  }

  return Response.json({ ok: true, decision: result })
}
