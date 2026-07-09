// GET /api/nodes – returns the current node list from Neon (durable state).

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { serviceNodes } from '@/lib/db/schema'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  try {
    assertDatabaseConfigured()
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database unavailable' },
      { status: 503 },
    )
  }

  const nodes = await db.select().from(serviceNodes)
  return Response.json({ nodes })
}
