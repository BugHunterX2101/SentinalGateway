'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decisions, decisionSteps, auditLog, serviceNodes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

export async function getDecisions() {
  const rows = await db
    .select()
    .from(decisions)
    .orderBy(desc(decisions.createdAt))
    .limit(50)

  const withSteps = await Promise.all(
    rows.map(async (d) => {
      const steps = await db
        .select()
        .from(decisionSteps)
        .where(eq(decisionSteps.decisionId, d.id))
        .orderBy(decisionSteps.stepIndex)
      return { ...d, steps }
    }),
  )

  return withSteps
}

const ActionSchema = z.object({
  action: z.enum(['approve', 'rollback']),
})

export async function applyDecisionAction(id: string, input: z.infer<typeof ActionSchema>) {
  const session = await getSession()
  const { action } = ActionSchema.parse(input)

  const outcome = action === 'approve' ? 'Contained' : 'Rolled back'
  const status = action === 'approve' ? 'approved' : 'rolled_back'

  const [updated] = await db
    .update(decisions)
    .set({ outcome, status, updatedAt: new Date() })
    .where(eq(decisions.id, id))
    .returning()

  if (!updated) throw new Error('Decision not found')

  // On rollback: restore the affected node (Payments) in DB
  if (action === 'rollback') {
    await db
      .update(serviceNodes)
      .set({
        health: 'healthy',
        circuit: 'closed',
        errorRate: '0.4',
        p99: '48',
        anomalyScore: '4',
        updatedAt: new Date(),
      })
      .where(eq(serviceNodes.id, 'payments'))
  }

  await db.insert(auditLog).values({
    type: 'decision',
    actor: 'operator',
    subject: updated.headline,
    detail:
      action === 'approve'
        ? `Operator ${session.user.name ?? session.user.email} approved automated mitigation.`
        : `Operator ${session.user.name ?? session.user.email} rolled back mitigation — Payments circuit reset.`,
  })

  revalidatePath('/decisions')
  return updated
}
