// GET /api/audit  – returns the full audit log as a downloadable JSON or CSV.
// Accept: application/json  → JSON array
// Accept: text/csv          → CSV export

import { getAuditLog } from '@/lib/live-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const accept = request.headers.get('accept') ?? ''
  const log = getAuditLog()

  if (accept.includes('text/csv')) {
    const header = 'timestamp,type,actor,subject,detail\n'
    const rows = log
      .map(
        (e) =>
          [
            new Date(e.timestamp).toISOString(),
            e.type,
            e.actor,
            e.subject,
            `"${e.detail.replace(/"/g, '""')}"`,
          ].join(','),
      )
      .join('\n')

    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sentinel-audit.csv"',
      },
    })
  }

  return Response.json({ log })
}
