// GET  /api/decisions        – list of recent automated decisions with traces
// POST /api/decisions/[id]/action – approve or roll back a decision

import { getDecisions } from '@/lib/live-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const decisions = getDecisions()
  return Response.json({ decisions })
}
