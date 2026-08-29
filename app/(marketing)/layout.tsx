import { Curtain } from '@/components/landing/footer'
import { LandingNav } from '@/components/landing/nav'
import { SmoothScroll } from '@/components/landing/smooth-scroll'
import './landing.css'

// The shell for the public page: the fixed pill nav, smooth scroll, and the
// curtain layer the page lifts away from at the very end. Everything
// inside .run-landing is styled by landing.css; the app's own layout
// (sidebar, cards, 24px title cap) does not apply here, and this page's
// rules do not leak out.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="run-landing flex-1">
      <SmoothScroll />
      <LandingNav />
      {children}
      <Curtain />
    </div>
  )
}
