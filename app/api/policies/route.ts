// GET  /api/policies  – list all shaping policies from Neon
// POST /api/policies  – create a new policy, persisted to Neon

import { getPolicies, createPolicy } from '@/app/actions/policies'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const policies = await getPolicies()
    return Response.json({ policies })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Neon DATABASE_URL is not configured') {
      return Response.json({ error: message }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }
  try {
    const policy = await createPolicy(body as Parameters<typeof createPolicy>[0])
    return Response.json({ ok: true, policy }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Neon DATABASE_URL is not configured') {
      return Response.json({ error: message }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 422 })
  }
}
