const steps = [
  {
    n: '01',
    title: 'Sense',
    body: 'Every request streams through a per-service model that learns seasonal baselines and flags deviations in sub-millisecond time.',
  },
  {
    n: '02',
    title: 'Decide',
    body: 'A graph-aware engine weighs signals, estimates blast radius, and picks the intervention with the smallest safe footprint.',
  },
  {
    n: '03',
    title: 'Act',
    body: 'Traffic shaping, load-shedding, and circuit breakers apply instantly at the edge — no config pushes, no restarts.',
  },
  {
    n: '04',
    title: 'Explain',
    body: 'Each action is recorded as an auditable trace with weighted signals and a confidence score you can review and override.',
  },
]

export function ClosedLoop() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 md:pb-24">
      <div className="glass-strong rounded-3xl p-8 md:p-12">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            One continuous control loop
          </h2>
          <p className="max-w-md text-muted-foreground">
            Sentinel closes the gap between detection and mitigation, turning minutes of manual
            triage into milliseconds of automated response.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-cyan">{s.n}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              {i < steps.length - 1 && (
                <span className="absolute -right-3 top-1 hidden text-muted-foreground md:block">→</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
