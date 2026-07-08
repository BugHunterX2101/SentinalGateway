'use client'

import { decisionMeta } from '@/lib/sentinel-data'
import { useLive } from '@/hooks/use-live'

export function DecisionSummary() {
  const { decisionConfidence, requestsProtected } = useLive()
  return (
    <div className="flex flex-col gap-4">
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
            {decisionMeta.outcome}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{decisionMeta.id}</span>
        </div>
        <h2 className="mt-4 text-balance text-xl font-semibold leading-snug text-foreground">
          {decisionMeta.headline}
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground">{decisionMeta.timestamp}</p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-sentinel-pulse" />
              Model confidence · live
            </span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{decisionConfidence}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-cyan transition-all duration-700"
              style={{ width: `${decisionConfidence}%` }}
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Meta label="Time to decide" value={decisionMeta.latencyToDecide} />
          <Meta label="Requests protected" value={requestsProtected.toLocaleString('en-US')} />
        </dl>

        <p className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {decisionMeta.model}
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground">Operator controls</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Every automated action is reversible. Sentinel keeps the loop open for human oversight.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Approve &amp; keep active
          </button>
          <button className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            Roll back mitigation
          </button>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}
