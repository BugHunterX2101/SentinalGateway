import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getPolicies } from '@/app/actions/policies'
import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { FlowBoard } from '@/components/flow/flow-board'
import { NewPolicyModal } from '@/components/flow/new-policy-modal'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Flow Canvas — Sentinel Gateway',
  description: 'Compose adaptive traffic shaping policies with priority lanes, fair queueing, and load-shedding rules.',
}

export default async function FlowCanvasPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  // Gracefully handle DB errors — show empty board rather than crashing.
  const policies = await getPolicies().catch(() => [])

  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <SiteNav user={user} />
      <LiveMetricsBar />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Flow Canvas"
          title="Adaptive Traffic Shaping"
          description="Compose priority lanes, fair queueing, and load-shedding rules. Sentinel enforces them at the edge and rebalances capacity in real time as conditions change."
        >
          <NewPolicyModal />
        </PageHeader>

        <div className="mt-8">
          <FlowBoard initialPolicies={policies} />
        </div>
      </div>
    </main>
  )
}
