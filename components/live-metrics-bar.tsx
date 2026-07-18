'use client'

import { useLive } from '@/hooks/use-live'
import { cn } from '@/lib/utils'

export function LiveMetricsBar() {
  const { kpis } = useLive()

  const stats = [
    {
      label: 'RPS',
      value: `${(kpis.rps / 1000).toFixed(1)}k`,
      color: 'text-cyan',
      title: 'Requests per second',
    },
    {
      label: 'p99',
      value: `${kpis.p99}ms`,
      color: kpis.p99 > 150 ? 'text-amber' : 'text-foreground',
      title: 'p99 latency in milliseconds',
    },
    {
      label: 'Error',
      value: `${kpis.errorRate.toFixed(2)}%`,
      color: kpis.errorRate > 2 ? 'text-coral' : 'text-foreground',
      title: 'Error rate percentage',
    },
    {
      label: 'Circuits',
      value: `${kpis.mitigations}`,
      color: kpis.mitigations > 0 ? 'text-amber' : 'text-foreground',
      title: 'Active circuit breakers / mitigations',
    },
  ]

  return (
    <nav
      aria-label="Live system metrics"
      className="mx-4 my-4 flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-2 backdrop-blur sm:mx-auto sm:max-w-7xl"
    >
      <div className="flex items-center gap-5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5" title={s.title}>
            <span className={cn('font-mono text-sm font-semibold tabular-nums', s.color)}>
              {s.value}
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" aria-hidden />
        <span>Live</span>
      </div>
    </nav>
  )
}
