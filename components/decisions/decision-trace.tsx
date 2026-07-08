'use client'

import { useState } from 'react'
import { decisionTrace, type DecisionStep } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'

const kindStyle: Record<DecisionStep['kind'], { dot: string; label: string; badge: string }> = {
  signal: { dot: 'bg-cyan', label: 'Signal', badge: 'bg-accent text-accent-foreground' },
  reasoning: { dot: 'bg-amber', label: 'Reasoning', badge: 'bg-amber/15 text-tangerine' },
  action: { dot: 'bg-coral', label: 'Action', badge: 'bg-coral/10 text-coral' },
}

export function DecisionTrace() {
  const [open, setOpen] = useState<number | null>(1)

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Reasoning trace</h2>
        <span className="text-xs text-muted-foreground">{decisionTrace.length} steps</span>
      </div>

      <ol className="mt-5">
        {decisionTrace.map((step, i) => {
          const s = kindStyle[step.kind]
          const isOpen = open === step.step
          const isLast = i === decisionTrace.length - 1
          return (
            <li key={step.step} className="relative pl-8">
              {!isLast && <span className="absolute left-[10px] top-6 h-full w-px bg-border" />}
              <span className={cn('absolute left-1.5 top-2 h-2.5 w-2.5 rounded-full ring-4 ring-background', s.dot)} />
              <button
                onClick={() => setOpen(isOpen ? null : step.step)}
                className="w-full pb-5 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{step.title}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', s.badge)}>
                    {s.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                    <div className={cn('h-full rounded-full', s.dot)} style={{ width: `${step.weight}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{step.weight}% weight</span>
                </div>
                {isOpen && (
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
