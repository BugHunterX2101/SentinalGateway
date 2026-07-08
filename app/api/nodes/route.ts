// GET  /api/nodes         – current service node list with live vitals
// POST /api/nodes/[id]/action – apply mitigation or snooze to a service node

import { getSnapshot } from '@/lib/live-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { nodes } = getSnapshot()
  return Response.json({ nodes })
}
