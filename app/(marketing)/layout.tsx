import { Instrument_Serif } from 'next/font/google'

import { Curtain } from '@/components/landing/footer'
import { LandingNav } from '@/components/landing/nav'
import { Reveal } from '@/components/landing/reveal'
import { SmoothScroll } from '@/components/landing/smooth-scroll'
import './landing.css'

// The page's display face. The app is sans throughout (styleguide 3); the
// front page is the one place a serif earns its keep, for the same reason
// the reference uses one: a headline that reads like a sentence someone
// said, with an italic turn, not a label. Loaded here and nowhere else.
const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-landing-serif',
})

// The shell for the public page: the fixed pill nav, smooth scroll, and the
// curtain layer the page lifts away from at the very end. Everything
// inside .run-landing is styled by landing.css; the app's own layout
// (sidebar, cards, 24px title cap) does not apply here, and this page's
// rules do not leak out.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`run-landing flex-1 ${serif.variable}`}>
      <SmoothScroll />
      <Reveal />
      <LandingNav />
      {children}
      <Curtain />
    </div>
  )
}
