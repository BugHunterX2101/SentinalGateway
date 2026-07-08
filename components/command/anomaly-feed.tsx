import Link from 'next/link'
import { anomalySignals, type AnomalySignal } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'

const severityStyle: Record<AnomalySignal['severity'], { dot: string; badge: string; label: string }> = {
  critical: { dot: 'bg-coral', badge: 'bg-coral/10 text-coral', label: 'Critical' },
  warning: { dot: 'bg-amber', badge: 'bg-amber/15 text-tangerine', label: 'Warning' },
  info: { dot: 'bg-cyan', badge: 'bg-accent text-accent-foreground', label: 'Info' },
}

export function AnomalyFeed() {
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Anomaly stream</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
          live
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-3 overflow-y-auto">
        {anomalySignals.map((a) => {
          const s = severityStyle[a.severity]
          return (
            <li key={a.id} className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                  <span className="text-sm font-medium text-foreground">{a.serviceLabel}</span>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', s.badge)}>
                  {s.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="text-foreground">{a.metric}</span> {a.baseline}{' '}
                <span aria-hidden>→</span>{' '}
                <span className="font-mono text-foreground">{a.observed}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.action}</p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{a.detectedAt} · {a.confidence}% conf.</span>
                <Link href="/decisions" className="font-medium text-cyan hover:underline">
                  Explain
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
