import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Same resolution as lib/db: prefer DATABASE_URL_1 (Vercel suffixed
    // var), fall back to DATABASE_URL.
    url: process.env.DATABASE_URL_1 || process.env.DATABASE_URL!,
  },
})
