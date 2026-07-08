'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { getDecisions } from '@/app/actions/decisions'

type Decision = Awaited<ReturnType<typeof getDecisions>>[number]

const phaseStyle: Record<string, { dot: string; label: string; badge: string }> = {
  sense:   { dot: 'bg-cyan',  label: 'Signal',    badge: 'bg-accent text-accent-foreground' },
  decide:  { dot: 'bg-amber', label: 'Reasoning', badge: 'bg-amber/15 text-tangerine' },
  act:     { dot: 'bg-coral', label: 'Action',    badge: 'bg-coral/10 text-coral' },
  explain: { dot: 'bg-primary', label: 'Explain', badge: 'bg-primary/10 text-primary' },
}

interface Props {
  decision: Decision | null
}

export function DecisionTrace({ decision }: Props) {
  const [open, setOpen] = useState<number | null>(0)
  const steps = decision?.steps ?? []

  if (!decision) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">No decisions on record yet.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Reasoning trace</h2>
        <span className="text-xs text-muted-foreground">{steps.length} steps</span>
      </div>

      <ol className="mt-5">
        {steps.map((step, i) => {
          const s = phaseStyle[step.phase] ?? phaseStyle['explain']
          const isOpen = open === step.stepIndex
          const isLast = i === steps.length - 1
          return (
            <li key={step.id} className="relative pl-8">
              {!isLast && (
                <span className="absolute left-[10px] top-6 h-full w-px bg-border" />
              )}
              <span
                className={cn(
                  'absolute left-1.5 top-2 h-2.5 w-2.5 rounded-full ring-4 ring-background',
                  s.dot,
                )}
              />
              <button
                onClick={() => setOpen(isOpen ? null : step.stepIndex)}
                className="w-full pb-5 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      s.badge,
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full', s.dot)}
                      style={{ width: `${step.confidence}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {step.confidence}% confidence · +{step.deltaMs}ms
                  </span>
                </div>
                {isOpen && (
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
