import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

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
