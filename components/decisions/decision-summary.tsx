'use client'

import { useState, useTransition } from 'react'
import { useLive } from '@/hooks/use-live'
import { CheckCircle, RotateCcw, Loader2 } from 'lucide-react'
import { applyDecisionAction } from '@/app/actions/decisions'
import type { getDecisions } from '@/app/actions/decisions'

type Decision = Awaited<ReturnType<typeof getDecisions>>[number]

interface Props {
  decision: Decision | null
}

export function DecisionSummary({ decision }: Props) {
  const { decisionConfidence, requestsProtected } = useLive()
  const [status, setStatus] = useState<string>(decision?.status ?? 'active')
  const [isPending, startTransition] = useTransition()

  if (!decision) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
      </div>
    )
  }

  function applyAction(action: 'approve' | 'rollback') {
    startTransition(async () => {
      try {
        const updated = await applyDecisionAction(decision!.id, { action })
        setStatus(updated.status)
      } catch {
        // keep current status on error
      }
    })
  }

  const isActive = status === 'active'
  const isApproved = status === 'approved'

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <span
            className={
              status === 'rolled_back'
                ? 'rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-medium text-coral'
                : 'rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground'
            }
          >
            {status === 'rolled_back' ? 'Rolled back' : isApproved ? 'Approved' : decision.outcome}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{decision.id}</span>
        </div>

        <h2 className="mt-4 text-balance text-xl font-semibold leading-snug text-foreground">
          {decision.headline}
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {decision.createdAt instanceof Date
            ? decision.createdAt.toLocaleString()
            : String(decision.createdAt)}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-sentinel-pulse rounded-full bg-cyan" />
              Model confidence · live
            </span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {decisionConfidence}%
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-cyan transition-all duration-700"
              style={{ width: `${decisionConfidence}%` }}
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Meta label="Time to decide" value={decision.latencyToDecide} />
          <Meta label="Requests protected" value={requestsProtected.toLocaleString('en-US')} />
        </dl>

        <p className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {decision.model}
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground">Operator controls</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Every automated action is reversible. Sentinel keeps the loop open for human oversight.
        </p>

        {!isActive && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground">
            {isApproved ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-coral" aria-hidden />
            )}
            {isApproved
              ? 'Mitigation approved and kept active.'
              : 'Mitigation rolled back. Circuit reset to closed.'}
          </div>
        )}

        {isActive && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => applyAction('approve')}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Approve &amp; keep active
            </button>
            <button
              onClick={() => applyAction('rollback')}
              disabled={isPending}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              Roll back mitigation
            </button>
          </div>
        )}
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
