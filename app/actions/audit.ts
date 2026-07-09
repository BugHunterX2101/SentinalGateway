'use server'

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

export async function getAuditLog(limit = 100) {
  await getSession()
  assertDatabaseConfigured()
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
}
