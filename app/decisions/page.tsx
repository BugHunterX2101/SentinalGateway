'use client'

import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { DecisionTrace } from '@/components/decisions/decision-trace'
import { DecisionSummary } from '@/components/decisions/decision-summary'
import { ExportAuditButton } from '@/components/decisions/export-audit-button'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export default function DecisionsPage() {
  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <SiteNav />
      <LiveMetricsBar />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Decision Explainer"
          title="X-Ray Inspector"
          description="Sentinel is a glass box. Open any automated action to see the exact signals it weighed, how it reasoned about blast radius, and why it chose this response."
        >
          <ExportAuditButton />
        </PageHeader>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <DecisionTrace />
          <DecisionSummary />
        </div>
      </div>
    </main>
  )
}
