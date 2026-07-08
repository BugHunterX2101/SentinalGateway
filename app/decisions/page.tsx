import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { DecisionTrace } from '@/components/decisions/decision-trace'
import { DecisionSummary } from '@/components/decisions/decision-summary'

export default function DecisionsPage() {
  return (
    <main className="min-h-dvh pb-16">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Decision Explainer"
          title="X-Ray Inspector"
          description="Sentinel is a glass box. Open any automated action to see the exact signals it weighed, how it reasoned about blast radius, and why it chose this response."
        >
          <button className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            Export audit log
          </button>
        </PageHeader>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <DecisionTrace />
          <DecisionSummary />
        </div>
      </div>
    </main>
  )
}
