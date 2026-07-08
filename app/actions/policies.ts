'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { shapingPolicies, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
  strategy: z.enum(['circuit-breaker', 'adaptive-shedding', 'rate-limiting', 'backpressure']),
  budget: z.number().min(0).max(100),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
})

const PolicyUpdateSchema = z.object({
  budget: z.number().min(0).max(100).optional(),
  state: z.enum(['learning', 'active', 'paused']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
})

export async function getPolicies() {
  return db.select().from(shapingPolicies).orderBy(shapingPolicies.createdAt)
}

export async function createPolicy(input: z.infer<typeof PolicyCreateSchema>) {
  const session = await getSession()
  const data = PolicyCreateSchema.parse(input)

  const id = `pol-${Date.now().toString(36)}`
  const [policy] = await db
    .insert(shapingPolicies)
    .values({ ...data, id, budget: data.budget.toString(), load: '0', createdBy: session.user.id })
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
  const data = PolicyUpdateSchema.parse(input)

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (data.budget !== undefined) patch.budget = data.budget.toString()
  if (data.state !== undefined) patch.state = data.state
  if (data.priority !== undefined) patch.priority = data.priority

  const [updated] = await db
    .update(shapingPolicies)
    .set(patch)
    .where(eq(shapingPolicies.id, id))
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

  const [deleted] = await db
    .delete(shapingPolicies)
    .where(eq(shapingPolicies.id, id))
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
