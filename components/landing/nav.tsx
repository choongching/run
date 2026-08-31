'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { DURATION, EASE, EASE_OUT, prefersReducedMotion } from '@/lib/landing/motion'

const ITEMS = [
  { href: '#how', label: 'How it works' },
  { href: '#safety', label: 'Safety' },
  { href: '#faq', label: 'FAQ' },
] as const

// Past this much scroll the wordmark folds away and only the mark is left;
// it comes back a little earlier than it went, so a scroll that hovers
// around the line does not make it flicker.
const COLLAPSE_AT = 400
const EXPAND_AT = 360
// The wordmark's wrapper folds to 0 and back to its own width; GSAP
// measures 'auto', so a change of face or size cannot leave air beside the
// word (a hand-set constant did exactly that once).

// The fixed pill nav, ported element for element from the reference's DOM
// (docs/reference/dom-outline-1440.txt, spec 4): a frosted ring drawn 4px
// outside the items (6px on desktop), each item a 44px link with its own
// white background layer and a 14px text layer, both fading over 300ms,
// Login on a glass wash, and one shared white pill that parks under the
// hovered item. Its colours follow the page: dark over the photograph,
// light everywhere else, forced light over the FAQ.
export function LandingNav() {
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [overHero, setOverHero] = useState(true)
  const [overFaq, setOverFaq] = useState(false)

  useEffect(() => {
    // Hysteresis: two thresholds, so the state only changes once the scroll
    // has clearly crossed the line in either direction.
    const onScroll = () => {
      const y = window.scrollY
      setCollapsed((c) => (c ? y > EXPAND_AT : y >= COLLAPSE_AT))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The theme follows the sections themselves, not scroll numbers.
  useGSAP(() => {
    const hero = document.querySelector('[data-landing-hero]')
    const faq = document.querySelector('#faq')
    if (hero) {
      ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onToggle: (self) => setOverHero(self.isActive) })
    }
    if (faq) {
      ScrollTrigger.create({ trigger: faq, start: 'top center', end: 'bottom center', onToggle: (self) => setOverFaq(self.isActive) })
    }
  }, [])

  // Folding the wordmark: word width -> 0 over 0.6s power4.out (spec 4.3).
  // A parked pill follows the items as they shift. This animates width,
  // against the motion skill's composite-only rule, and is accepted: the
  // effect IS the items beside it reflowing, it runs once per crossing of
  // the line for 0.6s, and the nav is five small items.
  useGSAP(
    () => {
      const el = wordmarkRef.current
      if (!el) return
      const width = collapsed ? 0 : 'auto'
      if (prefersReducedMotion()) {
        gsap.set(el, { width })
        return
      }
      gsap.to(el, {
        width,
        duration: DURATION.medium,
        ease: EASE,
        onUpdate: () => {
          const item = navRef.current?.querySelector<HTMLElement>('[data-parked]')
          if (item) gsap.set(pillRef.current, { x: item.offsetLeft, width: item.offsetWidth })
        },
      })
    },
    { dependencies: [collapsed] }
  )

  // Asked at the moment of the event, not on mount.
  const canHover = () => window.matchMedia('(hover: hover)').matches

  // The item the pill is parked under carries data-parked; reading it back
  // from the DOM keeps the GSAP hook free of any ref it would have to own.
  const parked = () => navRef.current?.querySelector<HTMLElement>('[data-parked]') ?? null
  const mark = (item: HTMLElement | null) => {
    parked()?.removeAttribute('data-parked')
    item?.setAttribute('data-parked', 'true')
  }
  // Park the pill under an item. The first time (pill at width 0) it is
  // set in place rather than slid in from the left edge; after that it
  // glides between items over 0.3s expo.out (spec 4.3).
  const park = (item: HTMLElement, instant = false) => {
    const pill = pillRef.current
    if (!pill) return
    const to = { x: item.offsetLeft, width: item.offsetWidth }
    if (instant || pill.offsetWidth === 0 || prefersReducedMotion()) {
      gsap.killTweensOf(pill)
      gsap.set(pill, to)
      return
    }
    gsap.to(pill, { ...to, duration: DURATION.fast, ease: EASE_OUT, overwrite: true })
  }
  const moveTo = (item: HTMLElement) => {
    mark(item)
    setHovered(true)
    park(item)
  }
  // Leaving the nav: the pill vanishes at once and the items' own white
  // backgrounds come back without a fade for 500ms, so nothing flashes on
  // the way out (spec 4.3).
  const snapTimer = useRef(0)
  const leave = () => {
    const pill = pillRef.current
    if (!pill) return
    mark(null)
    setHovered(false)
    gsap.killTweensOf(pill)
    gsap.set(pill, { width: 0 })
    navRef.current?.setAttribute('data-nav-snap', 'true')
    window.clearTimeout(snapTimer.current)
    snapTimer.current = window.setTimeout(() => navRef.current?.removeAttribute('data-nav-snap'), 500)
  }

  const theme = overFaq ? 'light' : overHero ? 'dark' : 'light'

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      data-nav-theme={theme}
      data-nav-hover={hovered}
      className="fixed left-1/2 top-4 z-10 flex w-max -translate-x-1/2 p-0"
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch' && canHover()) leave()
      }}
      // Delegated, and on every move rather than on enter: an enter event
      // can be skipped when the pointer crosses two items in one frame.
      onPointerMove={(e) => {
        if (e.pointerType === 'touch' || !canHover()) return
        const item = (e.target as Element).closest('a')
        if (item && item !== parked()) moveTo(item)
      }}
      onBlur={(e) => {
        if (navRef.current?.contains(e.relatedTarget as Node)) return
        const pill = pillRef.current
        if (pill && !hovered) gsap.set(pill, { width: 0 })
      }}
    >
      {/* The ring, 4px outside the items, 6px on desktop (spec 4.2). */}
      <div
        aria-hidden
        className="ld-nav-ring pointer-events-none absolute left-[-4px] top-[-4px] h-[52px] w-[calc(100%+8px)] xl:left-[-6px] xl:top-[-6px] xl:h-[56px] xl:w-[calc(100%+12px)]"
      />
      {/* The shared pill. Width 0 until a pointer or focus parks it. */}
      <span ref={pillRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-11 w-0 rounded-2xl bg-white" />
      <Link href="/" aria-label="Run home" className="ld-nav-a group relative h-11 outline-none" onFocus={(e) => park(e.currentTarget, true)}>
        <span className="ld-nav-bg" />
        <div className="ld-nav-text">
          <Image src="/run-icon.png" alt="" width={21} height={21} className="ld-nav-mark" priority />
          {/* No gap beside the mark: the word carries its own 6px lead
              inside the wrapper, so folding the wrapper to 0 leaves the mark
              centred in its pill. */}
          <span ref={wordmarkRef} className="inline-block overflow-hidden whitespace-nowrap">
            <span className="ld-nav-wordmark ml-1.5">Run</span>
          </span>
        </div>
      </Link>
      {ITEMS.map((item) => (
        <a key={item.href} href={item.href} className="ld-nav-a group relative h-11 outline-none max-md:hidden" onFocus={(e) => park(e.currentTarget, true)}>
          <span className="ld-nav-bg" />
          <div className="ld-nav-text">{item.label}</div>
        </a>
      ))}
      <Link href="/login" className="ld-nav-a ld-nav-login group relative h-11 outline-none" onFocus={(e) => park(e.currentTarget, true)}>
        <span className="ld-nav-bg" />
        <div className="ld-nav-text">Log in</div>
      </Link>
    </nav>
  )
}
