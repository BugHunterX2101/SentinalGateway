import Link from 'next/link'
import { SentinelLogo } from '@/components/sentinel-logo'

export function CtaFooter() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-12">
      <div className="glass relative overflow-hidden rounded-3xl px-6 py-14 text-center md:py-20">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          Give your APIs a nervous system.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Deploy Sentinel Gateway in front of any service and let it sense, decide, and heal —
          with every move fully explained.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/command-center"
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Launch the console
          </Link>
          <Link
            href="/flow-canvas"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Explore traffic shaping
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <SentinelLogo />
          <span className="text-sm font-semibold text-foreground">Sentinel Gateway</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Sense · Decide · Act · Explain — a self-aware API gateway.
        </p>
      </div>
    </footer>
  )
}
