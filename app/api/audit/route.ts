// GET /api/audit  – returns the durable audit log from Neon.
// Accept: application/json  → JSON array
// Accept: text/csv          → CSV download

import { getAuditLog } from '@/app/actions/audit'

export const dynamic = 'force-dynamic'

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  try {
    const log = await getAuditLog(200)
    const accept = request.headers.get('accept') ?? ''

    if (accept.includes('text/csv')) {
      const header = 'timestamp,type,actor,subject,detail\n'
      const rows = log
        .map((e) =>
          [
            escapeCsv(e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt),
            escapeCsv(e.type),
            escapeCsv(e.actor),
            escapeCsv(e.subject),
            escapeCsv(e.detail),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') return new Response('Unauthorized', { status: 401 })
    if (message === 'Neon DATABASE_URL is not configured') {
      return Response.json({ error: message }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
