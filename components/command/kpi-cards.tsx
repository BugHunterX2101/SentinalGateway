import { kpis } from '@/lib/sentinel-data'
import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'

const trendColor: Record<string, string> = {
  cyan: 'text-cyan',
  amber: 'text-amber',
  coral: 'text-coral',
  indigo: 'text-primary',
}

export function KpiCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{kpi.value}</p>
            </div>
            <span className={cn('text-xs font-medium', trendColor[kpi.accent])}>{kpi.delta}</span>
          </div>
          <div className="mt-3">
            <Sparkline data={kpi.series} accent={kpi.accent} width={220} height={44} />
          </div>
        </div>
      ))}
    </div>
  )
}
