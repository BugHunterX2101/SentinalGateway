// Single-shot JSON snapshot of the current live service topology from Neon.
// Used for initial hydration or polling clients that do not support SSE.

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { serviceNodes, shapingPolicies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    assertDatabaseConfigured()
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database unavailable' },
      { status: 503 },
    )
  }

  try {
    const [nodes, policies] = await Promise.all([
      db.select().from(serviceNodes),
      db.select().from(shapingPolicies).where(eq(shapingPolicies.createdBy, session.user.id)),
    ])

    return Response.json({ nodes, policies })
  } catch {
    return Response.json({ error: 'Database unavailable' }, { status: 503 })
  }
}
