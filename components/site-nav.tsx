'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SentinelLogo } from './sentinel-logo'
import { SignOutButton } from './sign-out-button'

const links = [
  { href: '/', label: 'Overview' },
  { href: '/command-center', label: 'Command Center' },
  { href: '/flow-canvas', label: 'Flow Canvas' },
  { href: '/decisions', label: 'Decisions' },
]

interface SiteNavProps {
  user?: { name?: string | null; email: string } | null
}

export function SiteNav({ user }: SiteNavProps = {}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <SentinelLogo />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Sentinel<span className="text-cyan"> Gateway</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
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

        {/* Desktop right controls */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 animate-sentinel-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
            </span>
            Live
          </span>
          {user ? (
            <>
              <span className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {user.name ?? user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/command-center"
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Launch console
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-secondary md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="glass-strong mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {links.map((link) => {
              const active =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
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
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-accent-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-70 animate-sentinel-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
              </span>
              Live
            </span>
            {user ? (
              <SignOutButton />
            ) : (
              <Link
                href="/command-center"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Launch console
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
