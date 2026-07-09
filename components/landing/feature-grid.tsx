'use client'

import { Activity, Shuffle, HeartPulse, ScanSearch, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLive } from '@/hooks/use-live'

type Accent = 'cyan' | 'amber' | 'coral' | 'indigo'

const accentBar: Record<Accent, string> = {
  cyan: 'bg-cyan',
  amber: 'bg-amber',
  coral: 'bg-coral',
  indigo: 'bg-primary',
}
const accentText: Record<Accent, string> = {
  cyan: 'text-cyan',
  amber: 'text-amber',
  coral: 'text-coral',
  indigo: 'text-primary',
}

export function FeatureGrid() {
  const { nodes, policies, decisionConfidence } = useLive()

  const peakAnomaly = Math.max(0, ...nodes.map((n) => n.anomalyScore))
  const shaping = policies.filter((p) => p.state === 'active').length
  const openCircuits = nodes.filter((n) => n.circuit !== 'closed').length

  const features: {
    icon: LucideIcon
    title: string
    body: string
    accent: Accent
    stat: string
    statLabel: string
  }[] = [
    {
      icon: Activity,
      title: 'Real-time Anomaly Detection',
      body: 'A streaming model learns each service\u2019s seasonal envelope and flags deviations in milliseconds — no static thresholds to tune.',
      accent: 'cyan',
      stat: `${peakAnomaly}`,
      statLabel: 'peak anomaly score',
    },
    {
      icon: Shuffle,
      title: 'Adaptive Traffic Shaping',
      body: 'Priority lanes, fair queueing, and load-shedding rebalance in real time so revenue-critical traffic never starves under load.',
      accent: 'amber',
      stat: `${shaping}`,
      statLabel: 'policies enforcing',
    },
    {
      icon: HeartPulse,
      title: 'Self-Healing Resilience',
      body: 'Graph-aware circuit breakers isolate the smallest possible blast radius, then probe and recover automatically once a service is healthy.',
      accent: 'coral',
      stat: `${openCircuits}`,
      statLabel: 'breakers engaged',
    },
    {
      icon: ScanSearch,
      title: 'Glass-Box Explainability',
      body: 'Every automated decision ships with a step-by-step trace, weighted signals, and a confidence score you can audit and trust.',
      accent: 'indigo',
      stat: `${decisionConfidence}%`,
      statLabel: 'decision confidence',
    },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          A gateway with instincts
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          Four capabilities work as one closed loop — sense, decide, act, and explain — so
          incidents are contained before your on-call ever gets paged.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <article
              key={f.title}
              className="glass group relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-1"
            >
              <span className={cn('absolute inset-x-0 top-0 h-1', accentBar[f.accent])} />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card">
                <Icon className={cn('h-5 w-5', accentText[f.accent])} aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground text-balance">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <div className="mt-4 flex items-baseline gap-2 border-t border-border/70 pt-3">
                <span className={cn('font-mono text-xl font-semibold tabular-nums', accentText[f.accent])}>
                  {f.stat}
                </span>
                <span className="text-xs text-muted-foreground">{f.statLabel}</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
