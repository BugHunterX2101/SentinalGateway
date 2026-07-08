'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLive } from '@/hooks/use-live'

export function HeroSection() {
  const { kpis, tick } = useLive()

  const liveStats = [
    { v: `${(kpis.rps / 1000).toFixed(1)}k`, l: 'Requests / sec', live: true },
    { v: `${kpis.p99} ms`, l: 'Global p99', live: true },
    { v: `${kpis.errorRate}%`, l: 'Error rate', live: true },
  ]

  return (
    <section className="relative overflow-hidden">
      {/* Prism centerpiece — bleeds behind the copy, dominant on the right. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 lg:w-[62%]">
        <Image
          src="/images/hero-prism-cropped.jpg"
          alt="Glass prism refracting a stream of live API telemetry into structured signal"
          fill
          priority
          sizes="(max-width: 1024px) 66vw, 62vw"
          className="object-cover object-center"
        />
        {/* Fade the left/bottom edges into the page so copy stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:pt-28 lg:pb-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 animate-sentinel-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
            </span>
            Live telemetry · tick #{tick}
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

          <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-border/70 pt-6">
            {liveStats.map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-2xl font-semibold tabular-nums text-foreground">{s.v}</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.live && <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />}
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
