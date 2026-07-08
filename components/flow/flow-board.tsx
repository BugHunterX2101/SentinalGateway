'use client'

import { useMemo, useState } from 'react'
import { shapingPolicies, type ShapingPolicy } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'

const priorityColor: Record<ShapingPolicy['priority'], string> = {
  P0: 'var(--coral)',
  P1: 'var(--amber)',
  P2: 'var(--cyan)',
  P3: 'var(--indigo)',
}

const stateStyle: Record<ShapingPolicy['state'], string> = {
  active: 'bg-accent text-accent-foreground',
  standby: 'bg-secondary text-muted-foreground',
  learning: 'bg-amber/15 text-tangerine',
}

export function FlowBoard() {
  const [policies, setPolicies] = useState(shapingPolicies)
  const [activeId, setActiveId] = useState(shapingPolicies[0].id)

  const active = policies.find((p) => p.id === activeId)!
  const totalBudget = useMemo(
    () => policies.filter((p) => p.state !== 'standby').reduce((sum, p) => sum + p.budget, 0),
    [policies],
  )
  // capacity model: 500 = fully allocated across active lanes
  const utilization = Math.min(100, Math.round((totalBudget / 500) * 100))

  function setBudget(id: string, budget: number) {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, budget } : p)))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Shaping policies</h2>
          <span className="text-xs text-muted-foreground">{policies.length} lanes configured</span>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {policies.map((p) => {
            const selected = p.id === activeId
            return (
              <li key={p.id}>
                <button
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-cyan bg-card'
                      : 'border-border bg-card/50 hover:bg-card',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground"
                        style={{ backgroundColor: priorityColor[p.priority] }}
                      >
                        {p.priority}
                      </span>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', stateStyle[p.state])}>
                      {p.state}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.target} · {p.strategy}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${p.budget}%`, backgroundColor: priorityColor[p.priority] }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground">{p.budget}%</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cluster capacity</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-foreground">{utilization}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                utilization > 90 ? 'bg-coral' : utilization > 75 ? 'bg-amber' : 'bg-cyan',
              )}
              style={{ width: `${utilization}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {utilization > 90
              ? 'Near saturation — Sentinel will begin shedding P3 traffic.'
              : 'Headroom available for priority bursts.'}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{active.name}</h3>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground"
              style={{ backgroundColor: priorityColor[active.priority] }}
            >
              {active.priority}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.description}</p>

          <div className="mt-5">
            <label htmlFor="budget" className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Capacity budget</span>
              <span className="font-mono text-cyan">{active.budget}%</span>
            </label>
            <input
              id="budget"
              type="range"
              min={0}
              max={100}
              value={active.budget}
              onChange={(e) => setBudget(active.id, Number(e.target.value))}
              className="mt-2 w-full accent-[var(--cyan)]"
            />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <dt className="text-[11px] text-muted-foreground">Strategy</dt>
              <dd className="mt-0.5 text-xs font-medium text-foreground">{active.strategy}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <dt className="text-[11px] text-muted-foreground">Target</dt>
              <dd className="mt-0.5 text-xs font-medium text-foreground">{active.target}</dd>
            </div>
          </dl>

          <button className="mt-5 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Deploy policy change
          </button>
        </div>
      </aside>
    </div>
  )
}
