import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getDecisions } from '@/app/actions/decisions'
import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { DecisionInspector } from '@/components/decisions/decision-inspector'
import { ExportAuditButton } from '@/components/decisions/export-audit-button'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Decision Explainer — Sentinel Gateway',
  description: 'Inspect every automated decision Sentinel has made, with full reasoning traces and operator controls.',
}

export default async function DecisionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  // Gracefully handle DB errors — show empty state rather than crashing.
  const decisions = await getDecisions().catch(() => [])

  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <SiteNav user={user} />
      <LiveMetricsBar />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Decision Explainer"
          title="X-Ray Inspector"
          description="Sentinel is a glass box. Open any automated action to see the exact signals it weighed, how it reasoned about blast radius, and why it chose this response."
        >
          <ExportAuditButton />
        </PageHeader>

        <div className="mt-8">
          {decisions.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-sm font-medium text-foreground">No decisions on record yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sentinel will record decisions here as it detects anomalies and takes automated actions.
              </p>
            </div>
          ) : (
            <DecisionInspector decisions={decisions} />
          )}
        </div>
      </div>
    </main>
  )
}
