import Link from 'next/link'
import { NervousSystemMap } from '@/components/nervous-system-map'

export function HeroSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 md:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
            Intelligent API Gateway
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            See your traffic <span className="text-cyan">think.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Sentinel Gateway watches every request in real time — detecting anomalies,
            shaping traffic adaptively, and healing itself with graph-aware circuit breakers.
            It runs like a nervous system for your APIs, and shows its work every step of the way.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/command-center"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Enter the command center
            </Link>
            <Link
              href="/decisions"
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Watch it explain a decision
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              { v: '<1ms', l: 'Detection overhead' },
              { v: '99.99%', l: 'Availability target' },
              { v: '840ms', l: 'Avg. time to mitigate' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-2xl font-semibold text-foreground">{s.v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="glass relative overflow-hidden rounded-3xl p-2">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Live service graph</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
              streaming
            </span>
          </div>
          <div className="h-[380px] w-full">
            <NervousSystemMap interactive={false} />
          </div>
        </div>
      </div>
    </section>
  )
}
