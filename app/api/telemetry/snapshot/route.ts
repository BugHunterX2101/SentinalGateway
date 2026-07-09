// Single-shot JSON snapshot of the current live service topology from Neon.
// Used for initial hydration or polling clients that do not support SSE.

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const [nodes, policies] = await Promise.all([
    db.select().from(serviceNodes),
    db.select().from(shapingPolicies),
  ])

  return Response.json({ nodes, policies })
}
