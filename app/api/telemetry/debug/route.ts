// TEMPORARY diagnostic route — reports which DATABASE_* env vars the
// deployed runtime sees. Will be removed once the production DB wiring
// is confirmed. Not linked anywhere in the UI.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return 'unparseable'
  }
}

export async function GET() {
  const vars = ['DATABASE_URL', 'DATABASE_URL_1', 'DATABASE_URL_2', 'POSTGRES_URL']
  const report: Record<string, string | null> = {}
  for (const name of vars) {
    const value = process.env[name]
    report[name] = value ? hostOf(value) : '(unset)'
  }
  report.resolved = hostOf(process.env.DATABASE_URL_1 || process.env.DATABASE_URL || '')
  return NextResponse.json(report)
}
