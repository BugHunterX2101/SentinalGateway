// PATCH  /api/policies/[id] – update budget or state, persisted to Neon
// DELETE /api/policies/[id] – delete a policy from Neon

import { updatePolicy, deletePolicy } from '@/app/actions/policies'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  try {
    const updated = await updatePolicy(id, body as Parameters<typeof updatePolicy>[1])
    return Response.json({ ok: true, policy: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Policy not found') return Response.json({ error: message }, { status: 404 })
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deletePolicy(id)
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Policy not found') return Response.json({ error: message }, { status: 404 })
    return Response.json({ error: message }, { status: 500 })
  }
}
