import { SiteNav } from '@/components/site-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { ClosedLoop } from '@/components/landing/closed-loop'
import { CtaFooter } from '@/components/landing/cta-footer'

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <SiteNav />
      <HeroSection />
      <FeatureGrid />
      <ClosedLoop />
      <CtaFooter />
    </main>
  )
}
