'use client'

import { useLive } from '@/hooks/use-live'
import { cn } from '@/lib/utils'

export function LiveMetricsBar() {
  const { kpis } = useLive()

  const stats = [
    { label: 'RPS', value: `${(kpis.rps / 1000).toFixed(1)}k`, color: 'text-cyan' },
    { label: 'p99', value: `${kpis.p99}ms`, color: kpis.p99 > 200 ? 'text-amber' : 'text-foreground' },
    { label: 'Error', value: `${kpis.errorRate}%`, color: kpis.errorRate > 5 ? 'text-coral' : 'text-foreground' },
    { label: 'Mitigations', value: `${kpis.mitigations}`, color: kpis.mitigations > 0 ? 'text-amber' : 'text-foreground' },
  ]

  return (
    <div className="mx-4 my-4 flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-2 backdrop-blur sm:mx-auto sm:max-w-7xl">
      <div className="flex items-center gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className={cn('font-mono text-sm font-semibold tabular-nums', s.color)}>
              {s.value}
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
        Live
      </div>
    </div>
  )
}
