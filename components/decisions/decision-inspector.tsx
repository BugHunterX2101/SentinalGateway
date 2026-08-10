'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DecisionTrace } from './decision-trace'
import { DecisionSummary } from './decision-summary'
import type { getDecisions } from '@/app/actions/decisions'

type Decision = Awaited<ReturnType<typeof getDecisions>>[number]

interface Props {
  decisions: Decision[]
}

function outcomeStyle(outcome: string, status: string) {
  if (status === 'rolled_back') return 'bg-coral/10 text-coral'
  if (status === 'approved') return 'bg-accent text-accent-foreground'
  return 'bg-amber/15 text-tangerine'
}

function relativeTime(date: Date | string, now: number): string {
  const d = date instanceof Date ? date : new Date(date)
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function DecisionInspector({ decisions }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string>(decisions[0]?.id ?? '')
  // `now` stays null until after mount so SSR and the first client render
  // agree (avoids hydration mismatches from Date.now()); it then ticks so
  // the relative timestamps stay fresh.
  const [now, setNow] = useState<number | null>(null)

  // New decisions arrive from the simulation engine on the SSE stream, but
  // this page is server-rendered — refresh the server component periodically
  // so the list stays current without a manual reload.
  useEffect(() => {
    setNow(Date.now())
    const refreshId = setInterval(() => router.refresh(), 15000)
    const clockId = setInterval(() => setNow(Date.now()), 15000)
    return () => {
      clearInterval(refreshId)
      clearInterval(clockId)
    }
  }, [router])

  const selected = decisions.find((d) => d.id === selectedId) ?? decisions[0] ?? null

  if (decisions.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">No decisions on record yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_360px]">
      {/* Decision list selector */}
      <div className="glass rounded-2xl p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {decisions.length} decision{decisions.length !== 1 ? 's' : ''} on record
        </p>
        <ul className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1">
          {decisions.map((d) => {
            const isActive = d.id === selectedId
            return (
              <li key={d.id}>
                <button
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-cyan bg-card'
                      : 'border-border bg-card/40 hover:bg-card',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-xs font-medium leading-snug text-foreground line-clamp-2">
                      {d.headline}
                    </p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        outcomeStyle(d.outcome, d.status),
                      )}
                    >
                      {d.status === 'rolled_back'
                        ? 'Rolled back'
                        : d.status === 'approved'
                          ? 'Approved'
                          : d.outcome}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {now === null ? 'just now' : relativeTime(d.createdAt, now)} · {d.steps.length} steps
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Reasoning trace for selected decision — keyed so React resets state on selection change.
          Prefix keeps sibling keys unique (trace vs summary). */}
      <DecisionTrace key={`trace-${selected?.id ?? 'empty'}`} decision={selected} />

      {/* Summary + operator controls — keyed for same reason */}
      <DecisionSummary key={`summary-${selected?.id ?? 'empty'}`} decision={selected} />
    </div>
  )
}
