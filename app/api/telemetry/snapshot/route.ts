// Single-shot JSON snapshot of the current live telemetry state.
// Useful for polling clients or initial hydration without SSE.

import { getSnapshot } from '@/lib/live-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(getSnapshot())
}
