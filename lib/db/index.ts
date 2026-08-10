import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// The working connection string for this deployment lives in DATABASE_URL_1
// (Vercel's "Add another" flow creates suffixed names and can leave a stale
// DATABASE_URL behind). Prefer the explicitly-set suffixed var, then fall
// back to the canonical DATABASE_URL.
const connectionString = process.env.DATABASE_URL_1 || process.env.DATABASE_URL

// Tuned for serverless (Vercel) + Neon:
// - Small `max`: Vercel keeps many warm function instances, each holding a
//   pool. A default 10-connection pool per instance exhausts Neon's
//   connection budget fast. 2-3 is plenty for this workload.
// - Timeouts so a misbehaving instance cannot hold a connection forever.
// - `maxUses` recycles connections, preventing stale/leaked ones from
//   accumulating across warm invocations.
export const pool = new Pool({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 8_000,
  idleTimeoutMillis: 30_000,
  maxUses: 500,
})

export const db = drizzle(pool, { schema })

export function assertDatabaseConfigured() {
  if (!connectionString) {
    throw new Error('Neon DATABASE_URL is not configured')
  }
}

// Drizzle wraps driver failures in DrizzleQueryError — the actual pg error
// (ECONNREFUSED, too many connections, SSL, auth, ...) lives in `cause`.
// Unwrap it so serverless/Neon connectivity issues are diagnosable.
export function dbErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) return String(err)
  const cause = (err as { cause?: unknown }).cause
  if (cause instanceof Error && cause.message && cause.message !== err.message) {
    return `${err.message} → ${cause.message}`
  }
  return err.message
}
