// POST /api/decisions/[id]/action
// Body: { action: 'approve' | 'rollback' }
// Persists the decision outcome to Neon and adds an audit log entry.

import { applyDecisionAction } from '@/app/actions/decisions'

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

  try {
    const result = await applyDecisionAction(id, { action: action as (typeof valid)[number] })
    return Response.json({ ok: true, decision: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Neon DATABASE_URL is not configured') {
      return Response.json({ error: message }, { status: 503 })
    }
    if (message === 'Decision not found') return Response.json({ error: message }, { status: 404 })
    return Response.json({ error: message }, { status: 500 })
  }
}
