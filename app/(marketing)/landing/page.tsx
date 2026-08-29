import type { Metadata } from 'next'

import { Capabilities } from '@/components/landing/capabilities'
import { CtaBanner } from '@/components/landing/cta-banner'
import { Faq } from '@/components/landing/faq'
import { FeatureStack } from '@/components/landing/feature-stack'
import { Footer } from '@/components/landing/footer'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Intro } from '@/components/landing/intro'
import { Safety } from '@/components/landing/safety'

// The public front page. A signed-out visit to / is rewritten here by the
// proxy, so the address bar says / and this file never appears in a URL a
// person would type. The canonical is / for the same reason.
export const metadata: Metadata = {
  title: 'Run turns a sentence into an assistant',
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
}

export default function LandingPage() {
  return (
    <div className="ld-page">
      <main>
        <Hero />
        <Intro />
        <FeatureStack />
        <Safety />
        <Capabilities />
        <HowItWorks />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
