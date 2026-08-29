import type { Metadata } from 'next'
import Image from 'next/image'

import { Capabilities } from '@/components/landing/capabilities'
import { CtaBanner } from '@/components/landing/cta-banner'
import { Faq } from '@/components/landing/faq'
import { FeatureStack } from '@/components/landing/feature-stack'
import { Footer } from '@/components/landing/footer'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
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
        <section aria-label="An agent, not a chatbot" className="flex flex-col items-center gap-6 px-5 pb-16 pt-20 text-center md:gap-7 md:pb-28 md:pt-36">
          <Image src="/run-icon.png" alt="" width={64} height={64} className="size-12 rounded-lg md:size-16" />
          <h2 className="ld-heading max-w-[900px]">An agent, not a chatbot.</h2>
          <p className="ld-lead max-w-[620px] text-muted-foreground">
            A chatbot waits for your next prompt. An agent works toward a goal. Think of a chatbot as a
            calculator and an agent as a colleague: you provide the intent, it provides the labor.
          </p>
        </section>
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
