import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl:
    connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
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
