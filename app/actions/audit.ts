'use server'

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

export async function getAuditLog(limit = 100) {
  await getSession()
  assertDatabaseConfigured()
  const safeLimit = z.number().int().min(1).max(200).parse(limit)
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(safeLimit)
}
