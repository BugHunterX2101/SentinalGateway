'use server'

import { auth } from '@/lib/auth'
import { assertDatabaseConfigured, db } from '@/lib/db'
import { serviceNodes, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session
}

const NodeActionSchema = z.object({
  action: z.enum(['mitigate', 'snooze', 'reset']),
})
const NodeIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)

// Default baselines used for the 'reset' action — keyed by node id.
const BASELINES: Record<string, { rps: string; p99: string; errorRate: string }> = {
  edge:      { rps: '48200',  p99: '34',  errorRate: '0.12' },
  authz:     { rps: '22400',  p99: '41',  errorRate: '0.21' },
  catalog:   { rps: '18900',  p99: '58',  errorRate: '0.4'  },
  search:    { rps: '15600',  p99: '60',  errorRate: '0.5'  },
  cart:      { rps: '9800',   p99: '62',  errorRate: '0.6'  },
  payments:  { rps: '9200',   p99: '48',  errorRate: '0.4'  },
  inventory: { rps: '7100',   p99: '31',  errorRate: '0.3'  },
  notify:    { rps: '5400',   p99: '22',  errorRate: '0.1'  },
}

export async function getNodes() {
  await getSession()
  assertDatabaseConfigured()
  return db.select().from(serviceNodes)
}

export async function applyNodeAction(nodeId: string, input: z.infer<typeof NodeActionSchema>) {
  const session = await getSession()
  assertDatabaseConfigured()
  const id = NodeIdSchema.parse(nodeId)
  const { action } = NodeActionSchema.parse(input)

  const [node] = await db.select().from(serviceNodes).where(eq(serviceNodes.id, id))
  if (!node) throw new Error('Node not found')

  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (action === 'mitigate') {
    const currentScore = Number(node.anomalyScore)
    patch.anomalyScore = Math.max(0, currentScore - 30).toString()
    if (node.health === 'critical') {
      patch.health = 'degraded'
      patch.circuit = 'half-open'
    } else if (node.health === 'degraded') {
      patch.health = 'healthy'
      patch.circuit = 'closed'
    }
  } else if (action === 'snooze') {
    patch.anomalyScore = '0'
  } else if (action === 'reset') {
    const base = BASELINES[id]
    if (base) {
      patch.rps = base.rps
      patch.p99 = base.p99
      patch.errorRate = base.errorRate
      patch.anomalyScore = '0'
      patch.health = 'healthy'
      patch.circuit = 'closed'
    }
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
