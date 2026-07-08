'use client'

import { useState } from 'react'
import { type ShapingPolicy } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'
import { useLive } from '@/hooks/use-live'

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
  const { policies: livePolicies } = useLive()
  // User-editable capacity budgets overlaid on the live utilization stream.
  const [budgetOverride, setBudgetOverride] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState(livePolicies[0].id)

  const policies = livePolicies.map((p) => ({
    ...p,
    budget: budgetOverride[p.id] ?? p.budget,
  }))

  const active = policies.find((p) => p.id === activeId) ?? policies[0]

  // Live cluster utilization = mean live load across enforcing lanes.
  const enforcing = policies.filter((p) => p.state !== 'standby')
  const utilization = Math.round(
    enforcing.reduce((s, p) => s + p.load, 0) / Math.max(1, enforcing.length),
  )

  function setBudget(id: string, budget: number) {
    setBudgetOverride((prev) => ({ ...prev, [id]: budget }))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Shaping policies</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
            {policies.length} lanes · live load
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {policies.map((p) => {
            const selected = p.id === activeId
            const over = p.load > p.budget
            return (
              <li key={p.id}>
                <button
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    selected ? 'border-cyan bg-card' : 'border-border bg-card/50 hover:bg-card',
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
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      {/* live load fill */}
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, p.load)}%`,
                          backgroundColor: over ? 'var(--coral)' : priorityColor[p.priority],
                        }}
                      />
                      {/* budget cap marker */}
                      <span
                        className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-foreground/50"
                        style={{ left: `${Math.min(100, p.budget)}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {p.load}/{p.budget}%
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
            Cluster capacity · live
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">{utilization}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
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

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Live utilization</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{active.load}%</span>
          </div>

          <div className="mt-4">
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
