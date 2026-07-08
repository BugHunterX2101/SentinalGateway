'use client'

import { useState, useTransition } from 'react'
import { X, Plus, CheckCircle } from 'lucide-react'
import { createPolicy } from '@/app/actions/policies'
import { cn } from '@/lib/utils'

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
const STRATEGIES = [
  'Priority lane + retry budget',
  'Adaptive concurrency limit',
  'Weighted fair queueing',
  'Async spill to queue',
  'Token-bucket smoothing',
  'Rate limiting',
]

export function NewPolicyModal() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: '',
    target: '',
    strategy: STRATEGIES[0],
    priority: 'high' as (typeof PRIORITIES)[number],
    budget: 80,
    description: '',
  })

  function handleChange(key: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      // Use live-store directly (same process) for instant reflection in UI,
      // and also POST to the REST API so external consumers see it.
      createPolicy({
        name: form.name,
        target: form.target,
        strategy: form.strategy,
        priority: form.priority,
        budget: form.budget,
        description: form.description,
      })

      await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).catch(() => null)

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
        setForm({ name: '', target: '', strategy: STRATEGIES[0], priority: 'P1', budget: 80, description: '' })
      }, 1500)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New policy
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-policy-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/10 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Modal */}
          <div className="glass-strong relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="new-policy-title" className="text-base font-semibold text-foreground">
                New shaping policy
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saved ? (
              <div className="mt-8 flex flex-col items-center gap-3 pb-4">
                <CheckCircle className="h-10 w-10 text-cyan" />
                <p className="text-sm font-medium text-foreground">Policy created</p>
                <p className="text-xs text-muted-foreground">
                  Sentinel is now learning the traffic envelope.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <Field label="Policy name" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Checkout protection"
                    required
                    className="w-full rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>

                <Field label="Target service / route" required>
                  <input
                    type="text"
                    value={form.target}
                    onChange={(e) => handleChange('target', e.target.value)}
                    placeholder="e.g. Cart → Payments"
                    required
                    className="w-full rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>

                <Field label="Strategy">
                  <select
                    value={form.strategy}
                    onChange={(e) => handleChange('strategy', e.target.value)}
                    className="w-full rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Priority">
                    <div className="flex gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleChange('priority', p)}
                          className={cn(
                            'flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors',
                            form.priority === p
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-secondary',
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label={`Budget: ${form.budget}%`}>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={form.budget}
                      onChange={(e) => handleChange('budget', Number(e.target.value))}
                      className="w-full accent-[var(--cyan)]"
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                    placeholder="What does this policy protect?"
                    className="w-full resize-none rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-1 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? 'Creating…' : 'Create policy'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-coral" aria-hidden>*</span>}
      </label>
      {children}
    </div>
  )
}
