'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SentinelLogo } from './sentinel-logo'

const links = [
  { href: '/', label: 'Overview' },
  { href: '/command-center', label: 'Command Center' },
  { href: '/flow-canvas', label: 'Flow Canvas' },
  { href: '/decisions', label: 'Decisions' },
]

export function SiteNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <SentinelLogo />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Sentinel<span className="text-cyan"> Gateway</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 animate-sentinel-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
            </span>
            Live
          </span>
          <Link
            href="/command-center"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Launch console
          </Link>
        </div>
      </div>
    </header>
  )
}
