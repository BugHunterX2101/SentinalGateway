'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useLiveWithDb } from '@/hooks/use-live'
import { updatePolicy } from '@/app/actions/policies'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { getPolicies } from '@/app/actions/policies'

type DbPolicy = Awaited<ReturnType<typeof getPolicies>>[number]

const priorityColor: Record<string, string> = {
  critical: 'var(--coral)',
  high:     'var(--amber)',
  medium:   'var(--cyan)',
  low:      'var(--indigo)',
}

const stateStyle: Record<string, string> = {
  active:   'bg-accent text-accent-foreground',
  learning: 'bg-amber/15 text-tangerine',
  paused:   'bg-secondary text-muted-foreground',
}

interface Props {
  initialPolicies: DbPolicy[]
}

export function FlowBoard({ initialPolicies }: Props) {
  // Live SSE stream keeps load percentages up to date; merge with DB policies.
  const { policies: livePolicies } = useLiveWithDb()
  const [budgetOverride, setBudgetOverride] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState(initialPolicies[0]?.id ?? '')
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Merge: DB gives authoritative state/budget; live SSE gives current load %.
  const policies = initialPolicies.map((p) => {
    const live = livePolicies.find((l) => l.id === p.id)
    return {
      ...p,
      budget: budgetOverride[p.id] ?? Number(p.budget),
      load: live?.load ?? 0,
    }
  })

  const active = policies.find((p) => p.id === activeId) ?? policies[0]
  if (!active) return null

  const enforcing = policies.filter((p) => p.state !== 'paused')
  const utilization = Math.round(
    enforcing.reduce((s, p) => s + p.load, 0) / Math.max(1, enforcing.length),
  )

  function setBudget(id: string, budget: number) {
    setBudgetOverride((prev) => ({ ...prev, [id]: budget }))
  }

  function deployPolicyChange() {
    startTransition(async () => {
      try {
        await updatePolicy(active.id, { budget: active.budget, state: 'active' })
        setDeployFeedback(`Policy "${active.name}" deployed at ${active.budget}% budget.`)
      } catch {
        setDeployFeedback('Deploy failed — please retry.')
      }
      setTimeout(() => setDeployFeedback(null), 4000)
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Policy list */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Shaping policies</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-sentinel-pulse rounded-full bg-cyan" />
            {policies.length} lanes · live load
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {policies.map((p) => {
            const selected = p.id === activeId
            const over = p.load > p.budget
            const color = priorityColor[p.priority] ?? 'var(--cyan)'
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
                        className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-white"
                        style={{ backgroundColor: color }}
                      >
                        {p.priority}
                      </span>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                        stateStyle[p.state] ?? stateStyle.paused,
                      )}
                    >
                      {p.state}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.target} · {p.strategy}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, p.load)}%`,
                          backgroundColor: over ? 'var(--coral)' : color,
                        }}
                      />
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

      {/* Policy editor */}
      <aside className="flex flex-col gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-sentinel-pulse rounded-full bg-cyan" />
            Cluster capacity · live
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">
            {utilization}%
          </p>
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
              ? 'Near saturation — Sentinel will begin shedding low-priority traffic.'
              : 'Headroom available for priority bursts.'}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{active.name}</h3>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-white"
              style={{ backgroundColor: priorityColor[active.priority] ?? 'var(--cyan)' }}
            >
              {active.priority}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Live utilization</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {active.load}%
            </span>
          </div>

          <div className="mt-4">
            <label
              htmlFor="budget"
              className="flex items-center justify-between text-xs font-medium text-foreground"
            >
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

          {deployFeedback && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
              {deployFeedback}
            </div>
          )}

          <button
            onClick={deployPolicyChange}
            disabled={isPending}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Deploy policy change
          </button>
        </div>
      </aside>
    </div>
  )
}
