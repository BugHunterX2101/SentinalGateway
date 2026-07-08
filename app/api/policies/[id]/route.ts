// PATCH /api/policies/[id] – update budget or state of an existing policy
// DELETE /api/policies/[id] – remove a policy from the live store

import { updatePolicy, deletePolicy } from '@/lib/live-store'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const updated = updatePolicy(id, body as Record<string, unknown>)
  if (!updated) {
    return Response.json({ error: `Policy '${id}' not found` }, { status: 404 })
  }

  return Response.json({ ok: true, policy: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ok = deletePolicy(id)
  if (!ok) {
    return Response.json({ error: `Policy '${id}' not found` }, { status: 404 })
  }
  return Response.json({ ok: true })
}
