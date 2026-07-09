'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useLive } from '@/hooks/use-live'

const HeroScene = dynamic(() => import('@/components/three/hero-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-24 w-24 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
    </div>
  ),
})

export function HeroSection() {
  const { kpis, tick } = useLive()

  // Format RPS to match image style: e.g. 131.6k
  const rpsFormatted = (() => {
    const k = kpis.rps / 1000
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
  })()

  const liveStats = [
    {
      v: rpsFormatted,
      l: 'Requests / sec',
      color: 'bg-cyan',
    },
    {
      v: `${kpis.p99} ms`,
      l: 'Global p99',
      color: 'bg-cyan',
    },
    {
      v: `${kpis.errorRate.toFixed(2)}%`,
      l: 'Error rate',
      color: 'bg-cyan',
    },
  ]

  return (
    <section className="relative">
      {/* 3D centerpiece — bleeds behind the copy, dominant on the right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-full lg:w-[80%]">
        <HeroScene />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:pt-28 lg:pb-28">
        <div className="max-w-2xl">
          {/* Live telemetry pill */}
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 animate-sentinel-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
            </span>
            Live telemetry &middot; tick #{tick}
          </span>

          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-7xl">
            Elevate Your
            <br />
            API Intelligence
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            A dynamic, intelligent API Gateway with real-time anomaly detection, adaptive
            traffic shaping, and self-healing resilience.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/command-center"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
            >
              Explore Sentinel
            </Link>
            <Link
              href="/decisions"
              className="rounded-full border border-border bg-card/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-secondary"
            >
              View Docs
            </Link>
          </div>

          {/* Live stat row — matches reference image layout */}
          <dl className="mt-14 grid max-w-md grid-cols-3 gap-x-6 gap-y-1 border-t border-border/70 pt-6">
            {liveStats.map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-2xl font-semibold tabular-nums text-foreground leading-tight">
                  {s.v}
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.color} animate-sentinel-pulse`} />
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
