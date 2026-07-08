// GET /api/decisions – list of recent decisions with steps, from Neon

import { getDecisions } from '@/app/actions/decisions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const decisions = await getDecisions()
    return Response.json({ decisions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    return Response.json({ error: message }, { status: 500 })
  }
}
