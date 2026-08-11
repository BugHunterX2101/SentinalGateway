'use server'

import { assertDatabaseConfigured, db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { getSession } from '@/lib/session'
import { desc } from 'drizzle-orm'
import { z } from 'zod'

async function requireSession() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

export async function getAuditLog(limit = 100) {
  await requireSession()
  assertDatabaseConfigured()
  const safeLimit = z.number().int().min(1).max(200).parse(limit)
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(safeLimit)
}
