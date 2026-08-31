import { Curtain } from '@/components/landing/footer'
import { LandingNav } from '@/components/landing/nav'
import { Reveal } from '@/components/landing/reveal'
import { SmoothScroll } from '@/components/landing/smooth-scroll'
import './landing.css'

// One type family, the app's own (styleguide 3): Geist, already loaded by
// the root layout, so the front page and the product behind it read as one
// thing. Nothing is loaded here.
// The shell for the public page: the fixed pill nav, smooth scroll, and the
// curtain layer the page lifts away from at the very end. Everything
// inside .run-landing is styled by landing.css; the app's own layout
// (sidebar, cards, 24px title cap) does not apply here, and this page's
// rules do not leak out.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="run-landing flex-1">
      <SmoothScroll />
      <Reveal />
      <LandingNav />
      {children}
      <Curtain />
    </div>
  )
}
