// GET  /api/policies       – list of adaptive shaping policies with live load
// POST /api/policies        – create a new policy (persisted in live-store)

import { getSnapshot, createPolicy } from '@/lib/live-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { policies } = getSnapshot()
  return Response.json({ policies })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { name, target, strategy, priority, budget, description } = body as Record<string, unknown>

  if (!name || !target || !strategy || !priority) {
    return Response.json({ error: 'Missing required fields: name, target, strategy, priority' }, { status: 422 })
  }

  const policy = createPolicy({
    name: String(name),
    target: String(target),
    strategy: String(strategy),
    priority: String(priority) as 'P0' | 'P1' | 'P2' | 'P3',
    budget: typeof budget === 'number' ? budget : 80,
    description: description ? String(description) : '',
  })

  return Response.json({ ok: true, policy }, { status: 201 })
}
