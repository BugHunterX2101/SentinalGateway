import Link from 'next/link'
import type { Metadata } from 'next'
import { SentinelLogo } from '@/components/sentinel-logo'

export const metadata: Metadata = {
  title: 'Page not found — Sentinel Gateway',
  description: 'The page you are looking for does not exist or has moved.',
}

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl px-8 py-12 text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <SentinelLogo />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-coral">404 — Signal lost</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">This route is not resolving</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          The page you requested does not exist or has been moved. The gateway could not route this request.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to overview
          </Link>
          <Link
            href="/command-center"
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Open command center
          </Link>
        </div>
      </div>
    </div>
  )
}
