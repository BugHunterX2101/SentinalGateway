import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

export const pool = new Pool({
  connectionString,
})

export const db = drizzle(pool, { schema })

export function assertDatabaseConfigured() {
  if (!connectionString) {
    throw new Error('Neon DATABASE_URL is not configured')
  }
}
