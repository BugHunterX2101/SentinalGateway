'use client'

import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'
import { useLive } from '@/hooks/use-live'

const trendColor: Record<string, string> = {
  cyan: 'text-cyan',
  amber: 'text-amber',
  coral: 'text-coral',
  indigo: 'text-primary',
}

type Accent = 'cyan' | 'amber' | 'coral' | 'indigo'

function delta(series: number[], unit: string, digits = 0) {
  if (series.length < 10) return '—'
  const now = series[series.length - 1]
  const then = series[series.length - 9]
  const d = now - then
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(digits)}${unit}`
}

export function KpiCards() {
  const { kpis, series } = useLive()

  const cards: {
    label: string
    value: string
    delta: string
    series: number[]
    accent: Accent
  }[] = [
    {
      label: 'Requests / sec',
      value: kpis.rps.toLocaleString('en-US'),
      delta: delta(series.rps, 'k', 1),
      series: series.rps,
      accent: 'cyan',
    },
    {
      label: 'Global p99',
      value: `${kpis.p99} ms`,
      delta: delta(series.latency, ' ms'),
      series: series.latency,
      accent: 'amber',
    },
    {
      label: 'Error rate',
      value: `${kpis.errorRate}%`,
      delta: delta(series.error, ' pts', 1),
      series: series.error,
      accent: 'coral',
    },
    {
      label: 'Auto-mitigations',
      value: `${kpis.mitigations} active`,
      delta: delta(series.mitigations, ''),
      series: series.mitigations,
      accent: 'indigo',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((kpi) => (
        <div key={kpi.label} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                {kpi.value}
              </p>
            </div>
            <span className={cn('text-xs font-medium tabular-nums', trendColor[kpi.accent])}>
              {kpi.delta}
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={kpi.series} accent={kpi.accent} width={220} height={44} />
          </div>
        </div>
      ))}
    </div>
  )
}
