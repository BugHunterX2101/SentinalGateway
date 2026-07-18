import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getDecisions } from '@/app/actions/decisions'
import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { DecisionInspector } from '@/components/decisions/decision-inspector'
import { ExportAuditButton } from '@/components/decisions/export-audit-button'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export const dynamic = 'force-dynamic'

export default async function DecisionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const decisions = await getDecisions()

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
          <DecisionInspector decisions={decisions} />
        </div>
      </div>
    </main>
  )
}
