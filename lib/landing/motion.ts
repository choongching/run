// Motion constants for the landing page. Taken from the reference spec
// (docs/spec/lassie-landing-spec.md, section 2.5) so every tween on the page
// agrees on a vocabulary, the same way the app's run-* utilities do.
export const DURATION = { fast: 0.3, medium: 0.6, slow: 1 } as const
export const EASE = 'power4.out'
export const EASE_OUT = 'expo.out'
export const EASE_IN_OUT = 'expo.inOut'

// The page's own breakpoints. They deliberately differ from the app's
// (md 768): a marketing page splits on the width where a pinned deck and its
// side column fit, which is a tablet in landscape, not a phone in landscape.
export const BREAKPOINTS = { tablet: 1024, desktop: 1280, desktopLarge: 1440 } as const

// One question, asked once. Every JS-driven animation on the page checks this
// before it starts; the CSS side is handled by the media query in landing.css.
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
