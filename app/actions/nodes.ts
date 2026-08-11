'use server'

import { assertDatabaseConfigured, db } from '@/lib/db'
import { serviceNodes, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { baselineFor } from '@/lib/baselines'

async function requireSession() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

const NodeActionSchema = z.object({
  action: z.enum(['mitigate', 'snooze', 'reset']),
})
const NodeIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)

export async function getNodes() {
  await requireSession()
  assertDatabaseConfigured()
  return db.select().from(serviceNodes)
}

export async function applyNodeAction(nodeId: string, input: z.infer<typeof NodeActionSchema>) {
  const session = await requireSession()
  assertDatabaseConfigured()
  const id = NodeIdSchema.parse(nodeId)
  const { action } = NodeActionSchema.parse(input)

  const [node] = await db.select().from(serviceNodes).where(eq(serviceNodes.id, id))
  if (!node) throw new Error('Node not found')

  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (action === 'mitigate') {
    const currentScore = Number(node.anomalyScore)
    patch.anomalyScore = Math.max(0, currentScore - 30).toString()
    patch.snoozedUntil = null
    if (node.health === 'critical') {
      patch.health = 'degraded'
      patch.circuit = 'half-open'
    } else if (node.health === 'degraded') {
      patch.health = 'healthy'
      patch.circuit = 'closed'
    }
  } else if (action === 'snooze') {
    // "Snooze" silences the anomaly feed (score + health) and holds the node
    // out of the simulation for 5 minutes so the incident engine cannot
    // immediately re-flag it. The circuit state stays visible so the operator
    // can still see the underlying condition while it is being probed.
    patch.anomalyScore = '0'
    patch.health = 'healthy'
    patch.snoozedUntil = new Date(Date.now() + 5 * 60_000)
  } else if (action === 'reset') {
    const base = baselineFor(id)
    if (base) {
      patch.rps = base.rps
      patch.p99 = base.p99
      patch.errorRate = base.errorRate
      patch.anomalyScore = '0'
      patch.health = 'healthy'
      patch.circuit = 'closed'
    }
    patch.snoozedUntil = null
  }

  const [updated] = await db
    .update(serviceNodes)
    .set(patch)
    .where(eq(serviceNodes.id, id))
    .returning()

  await db.insert(auditLog).values({
    type: 'mitigation',
    actor: 'operator',
    subject: node.name,
    detail: `Operator ${session.user.name ?? session.user.email} applied '${action}' to ${node.name}.`,
  })

  revalidatePath('/command-center')
  return updated
}
