'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { type AnomalySignal } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'
import { useLive, formatRelative } from '@/hooks/use-live'

const severityStyle: Record<AnomalySignal['severity'], { dot: string; badge: string; label: string }> = {
  critical: { dot: 'bg-coral', badge: 'bg-coral/10 text-coral', label: 'Critical' },
  warning: { dot: 'bg-amber', badge: 'bg-amber/15 text-tangerine', label: 'Warning' },
  info: { dot: 'bg-cyan', badge: 'bg-accent text-accent-foreground', label: 'Info' },
}

export function AnomalyFeed() {
  const { anomalies } = useLive()
  // `now` stays null until after mount so SSR and first client render agree; a
  // ticking clock then keeps the relative timestamps fresh.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Anomaly stream</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
          live
        </span>
      </div>

      <ul className="mt-4 flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
        {anomalies.length === 0 && (
          <li className="rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            All services nominal — no anomalies detected.
          </li>
        )}
        {anomalies.map((a) => {
          const s = severityStyle[a.severity]
          return (
            <li
              key={a.id}
              className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-border bg-card/60 p-3.5 duration-500"
            >
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
                <span className="tabular-nums">
                  {now === null ? 'just now' : formatRelative(a.detectedAt, now)} · {a.confidence}% conf.
                </span>
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
