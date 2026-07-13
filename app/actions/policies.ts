'use server'

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { shapingPolicies, auditLog } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

const PolicyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  target: z.string().min(1),
  strategy: z.string().min(1),
  budget: z.number().min(0).max(100),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().optional().default(''),
})

const PolicyUpdateSchema = z.object({
  budget: z.number().min(0).max(100).optional(),
  state: z.enum(['learning', 'active', 'standby', 'paused']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
})

const PolicyIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)

export async function getPolicies() {
  const session = await getSession()
  assertDatabaseConfigured()
  return db
    .select()
    .from(shapingPolicies)
    .where(eq(shapingPolicies.createdBy, session.user.id))
    .orderBy(shapingPolicies.createdAt)
}

export async function createPolicy(input: z.infer<typeof PolicyCreateSchema>) {
  const session = await getSession()
  assertDatabaseConfigured()
  const data = PolicyCreateSchema.parse(input)

  const id = `pol-${Date.now().toString(36)}`
  const [policy] = await db
    .insert(shapingPolicies)
    .values({
      id,
      name: data.name,
      target: data.target,
      strategy: data.strategy,
      budget: data.budget.toString(),
      priority: data.priority,
      state: 'learning',
      load: '0',
      createdBy: session.user.id,
    })
    .returning()

  await db.insert(auditLog).values({
    type: 'policy',
    actor: 'operator',
    subject: data.name,
    detail: `Policy created: ${data.strategy} for ${data.target} by ${session.user.name ?? session.user.email}.`,
  })

  revalidatePath('/flow-canvas')
  return policy
}

export async function updatePolicy(
  id: string,
  input: z.infer<typeof PolicyUpdateSchema>,
) {
  const session = await getSession()
  assertDatabaseConfigured()
  const policyId = PolicyIdSchema.parse(id)
  const data = PolicyUpdateSchema.parse(input)

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (data.budget !== undefined) patch.budget = data.budget.toString()
  if (data.state !== undefined) patch.state = data.state
  if (data.priority !== undefined) patch.priority = data.priority

  const [updated] = await db
    .update(shapingPolicies)
    .set(patch)
    .where(and(eq(shapingPolicies.id, policyId), eq(shapingPolicies.createdBy, session.user.id)))
    .returning()

  if (!updated) throw new Error('Policy not found')

  await db.insert(auditLog).values({
    type: 'policy',
    actor: 'operator',
    subject: updated.name,
    detail: `Policy updated by ${session.user.name ?? session.user.email}: ${JSON.stringify(data)}.`,
  })

  revalidatePath('/flow-canvas')
  return updated
}

export async function deletePolicy(id: string) {
  const session = await getSession()
  assertDatabaseConfigured()
  const policyId = PolicyIdSchema.parse(id)

  const [deleted] = await db
    .delete(shapingPolicies)
    .where(and(eq(shapingPolicies.id, policyId), eq(shapingPolicies.createdBy, session.user.id)))
    .returning()

  if (!deleted) throw new Error('Policy not found')

  await db.insert(auditLog).values({
    type: 'policy',
    actor: 'operator',
    subject: deleted.name,
    detail: `Policy deleted by ${session.user.name ?? session.user.email}.`,
  })

  revalidatePath('/flow-canvas')
}
