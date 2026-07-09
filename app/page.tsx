import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { SiteNav } from '@/components/site-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { ClosedLoop } from '@/components/landing/closed-loop'
import { CtaFooter } from '@/components/landing/cta-footer'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)

  return (
    <main className="relative z-10 min-h-dvh">
      <SiteNav user={session?.user ?? null} />
      <HeroSection />
      <FeatureGrid />
      <ClosedLoop />
      <CtaFooter />
    </main>
  )
}
