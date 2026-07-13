import { Pool } from 'pg'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue

    const [, key, rawValue] = match
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2')
    process.env[key] = value
  }
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
})

try {
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  )

  for (const { table_name: tableName } of tables.rows) {
    const columns = await pool.query(
      `select column_name, data_type
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [tableName],
    )
    console.log(`${tableName}: ${columns.rows.map((c) => `${c.column_name}:${c.data_type}`).join(', ')}`)
  }
} finally {
  await pool.end()
}
