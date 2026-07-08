import { featureHighlights } from '@/lib/sentinel-data'
import { cn } from '@/lib/utils'

const accentBar: Record<string, string> = {
  cyan: 'bg-cyan',
  amber: 'bg-amber',
  coral: 'bg-coral',
  indigo: 'bg-primary',
}

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          A gateway with instincts
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          Four capabilities work as one closed loop — sense, decide, act, and explain — so
          incidents are contained before your on-call ever gets paged.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {featureHighlights.map((f) => (
          <article
            key={f.title}
            className="glass group relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-0.5"
          >
            <span className={cn('absolute inset-x-0 top-0 h-1', accentBar[f.accent])} />
            <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
