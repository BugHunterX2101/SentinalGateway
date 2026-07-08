'use client'

import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { FlowBoard } from '@/components/flow/flow-board'
import { NewPolicyModal } from '@/components/flow/new-policy-modal'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export default function FlowCanvasPage() {
  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <SiteNav />
      <LiveMetricsBar />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Flow Canvas"
          title="Adaptive traffic shaping"
          description="Compose priority lanes, fair queueing, and load-shedding rules. Sentinel enforces them at the edge and rebalances capacity in real time as conditions change."
        >
          <NewPolicyModal />
        </PageHeader>

        <div className="mt-8">
          <FlowBoard />
        </div>
      </div>
    </main>
  )
}
