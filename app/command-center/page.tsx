import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { SiteNav } from '@/components/site-nav'
import { PageHeader } from '@/components/page-header'
import { KpiCards } from '@/components/command/kpi-cards'
import { CommandConsole } from '@/components/command/command-console'
import { AnomalyFeed } from '@/components/command/anomaly-feed'
import { LiveMetricsBar } from '@/components/live-metrics-bar'

export default async function CommandCenterPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <SiteNav user={user} />
      <LiveMetricsBar />
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <PageHeader
          eyebrow="Command Center"
          title="The Nervous System Map"
          description="A single, living view of every service, flow, and automated mitigation. Watch Sentinel sense trouble and respond in real time."
        >
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Region: us-east-1
          </span>
        </PageHeader>

        <div className="mt-8">
          <KpiCards />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
          <CommandConsole />
          <AnomalyFeed />
        </div>
      </div>
    </main>
  )
}
