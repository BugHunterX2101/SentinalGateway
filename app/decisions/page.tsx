import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getDecisions } from '@/app/actions/decisions'
import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { DecisionTrace } from '@/components/decisions/decision-trace'
import { DecisionSummary } from '@/components/decisions/decision-summary'
import { ExportAuditButton } from '@/components/decisions/export-audit-button'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export const dynamic = 'force-dynamic'

export default async function DecisionsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const decisions = await getDecisions()
  const latest = decisions[0] ?? null

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
          <DecisionTrace decision={latest} />
          <DecisionSummary decision={latest} />
        </div>
      </div>
    </main>
  )
}
