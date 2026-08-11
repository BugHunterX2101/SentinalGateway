// GET /api/nodes – returns the current node list from Neon (durable state).

import { getNodes } from '@/app/actions/nodes'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const nodes = await getNodes()
    return Response.json({ nodes })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Neon DATABASE_URL is not configured') {
      return Response.json({ error: message }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
