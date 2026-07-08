'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
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

// Default baselines used for 'reset' action
const BASELINES: Record<string, { rps: string; p99: string; errorRate: string }> = {
  gateway:   { rps: '131600', p99: '12',  errorRate: '0.4'  },
  auth:      { rps: '28400',  p99: '18',  errorRate: '0.2'  },
  payments:  { rps: '9200',   p99: '48',  errorRate: '0.4'  },
  search:    { rps: '44100',  p99: '55',  errorRate: '0.5'  },
  inventory: { rps: '19800',  p99: '31',  errorRate: '0.3'  },
  notify:    { rps: '7600',   p99: '22',  errorRate: '0.1'  },
  cdn:       { rps: '210000', p99: '4',   errorRate: '0.05' },
  ml:        { rps: '3100',   p99: '90',  errorRate: '0.5'  },
}

export async function getNodes() {
  return db.select().from(serviceNodes)
}

export async function applyNodeAction(nodeId: string, input: z.infer<typeof NodeActionSchema>) {
  const session = await getSession()
  const { action } = NodeActionSchema.parse(input)

  const [node] = await db.select().from(serviceNodes).where(eq(serviceNodes.id, nodeId))
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
    const base = BASELINES[nodeId]
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
    .where(eq(serviceNodes.id, nodeId))
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
