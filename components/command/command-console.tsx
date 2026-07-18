'use client'

import { useState, useTransition } from 'react'
import { NervousSystemMap } from '@/components/nervous-system-map'
import { type ServiceNode, type CircuitState } from '@/hooks/use-live'
import { cn } from '@/lib/utils'
import { useLiveWithDb } from '@/hooks/use-live'
import { CheckCircle, Loader2 } from 'lucide-react'

const circuitStyle: Record<CircuitState, { label: string; className: string }> = {
  closed: { label: 'Circuit closed', className: 'bg-accent text-accent-foreground' },
  'half-open': { label: 'Half-open · probing', className: 'bg-amber/15 text-tangerine' },
  open: { label: 'Circuit open', className: 'bg-coral/10 text-coral' },
}

const healthLabel: Record<ServiceNode['health'], string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
  quarantined: 'Quarantined',
}

export function CommandConsole() {
  const { nodes } = useLiveWithDb()
  const [selectedId, setSelectedId] = useState<string>(() => '')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Always read the live version of the selected node so its vitals update in real time.
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0]
  if (!selected) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
        Waiting for authenticated live service telemetry from the database.
      </div>
    )
  }

  const circuit = circuitStyle[selected.circuit]

  function triggerAction(action: 'mitigate' | 'snooze') {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/nodes/${selected.id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        if (res.ok) {
          setFeedback(action === 'mitigate' ? 'Mitigation applied.' : 'Alert snoozed.')
        } else {
          setFeedback('Action failed — please retry.')
        }
      } catch {
        setFeedback('Network error — please retry.')
      }
      setTimeout(() => setFeedback(null), 3000)
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Nervous System Map</h2>
            <p className="text-xs text-muted-foreground">Select a node to inspect its vitals</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="bg-cyan" label="Healthy" />
            <Legend color="bg-amber" label="Degraded" />
            <Legend color="bg-coral" label="Critical" />
          </div>
        </div>
        <div className="h-[440px] w-full p-2">
          <NervousSystemMap onSelect={(n) => setSelectedId(n.id)} selectedId={selected.id} />
        </div>
      </div>

      <aside className="glass flex flex-col rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inspecting</p>
            <h3 className="mt-0.5 text-xl font-semibold text-foreground">{selected.name}</h3>
            {/* Show group/layer only when it has a meaningful value; fall back to node id */}
            {(selected.group || selected.id) && (
              <p className="text-xs text-muted-foreground">{selected.group || selected.id}</p>
            )}
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium',
              selected.health === 'healthy'
                ? 'bg-accent text-accent-foreground'
                : selected.health === 'degraded'
                  ? 'bg-amber/15 text-tangerine'
                  : 'bg-coral/10 text-coral',
            )}
          >
            {healthLabel[selected.health]}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Throughput" value={`${(selected.rps / 1000).toFixed(1)}k`} unit="rps" />
          <Stat label="p99 latency" value={`${selected.p99}`} unit="ms" />
          <Stat label="Error rate" value={`${selected.errorRate}`} unit="%" />
          <Stat label="Anomaly score" value={`${selected.anomalyScore}`} unit="/100" />
        </div>

        <div className="mt-5">
          <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium', circuit.className)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {circuit.label}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs font-medium text-foreground">Sentinel recommendation</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {recommendation(selected)}
          </p>
        </div>

        {feedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
            {feedback}
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <button
            onClick={() => triggerAction('mitigate')}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Apply mitigation
          </button>
          <button
            onClick={() => triggerAction('snooze')}
            disabled={isPending}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Snooze alert
          </button>
        </div>
      </aside>
    </div>
  )
}

function recommendation(node: ServiceNode) {
  if (node.circuit === 'open')
    return 'Circuit is open and traffic is buffered. Half-open probe scheduled — no action needed unless recovery stalls past 2 minutes.'
  if (node.health === 'degraded')
    return 'Latency is drifting above SLO. Adaptive shaping is shedding low-priority traffic; consider scaling the pool if the trend continues.'
  return 'Operating within learned baselines. Sentinel is observing and will intervene automatically if signals cross threshold.'
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      {label}
    </span>
  )
}
