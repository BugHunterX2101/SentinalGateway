import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/session'
import { SiteNav } from '@/components/site-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { ClosedLoop } from '@/components/landing/closed-loop'
import { CtaFooter } from '@/components/landing/cta-footer'

export const metadata: Metadata = {
  title: 'Sentinel Gateway — The Self-Aware API Gateway',
  description:
    'Elevate your API intelligence with real-time anomaly detection, adaptive traffic shaping, self-healing circuit breaking, and glass-box decision explainability.',
}

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null)

  return (
    <main className="relative z-10 min-h-dvh">
      <SiteNav user={user} />
      <HeroSection isAuthenticated={!!user} />
      <FeatureGrid />
      <ClosedLoop />
      <CtaFooter />
    </main>
  )
}
