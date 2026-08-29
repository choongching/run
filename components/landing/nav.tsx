'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { DURATION, EASE, prefersReducedMotion } from '@/lib/landing/motion'
import { cn } from '@/lib/utils'

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

// The fixed pill nav. Three things move here, and each answers something:
//
//   - Its colours follow the page: dark over the photo, light everywhere
//     else, and forced light while the FAQ is on screen. That is a fact about
//     what is behind it, so it changes with scroll and nothing else.
//   - The wordmark folds away once the page is underway. The pill is over
//     content by then, and the mark alone is enough to say whose page it is.
//   - One white pill slides under whichever item the pointer is on, instead
//     of each item lighting up on its own. Touch devices skip it (there is no
//     pointer to follow) and the keyboard gets the same pill on focus.
export function LandingNav() {
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [overHero, setOverHero] = useState(true)
  const [overFaq, setOverFaq] = useState(false)
  // The wordmark's natural width, read once before any tween touches it,
  // so folding to 0 and back lands on the real number for the face in use.
  const wordmarkWidth = useRef(0)

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

  // The theme follows the sections themselves, not scroll numbers, so a
  // taller hero on a phone still switches at the right place.
  useGSAP(() => {
    const hero = document.querySelector('[data-landing-hero]')
    const faq = document.querySelector('#faq')
    if (hero) {
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        onToggle: (self) => setOverHero(self.isActive),
      })
    }
    if (faq) {
      ScrollTrigger.create({
        trigger: faq,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => setOverFaq(self.isActive),
      })
    }
  }, [])

  // Folding the wordmark is the one width tween on the page. It reflows the
  // pill, and the pill is the only thing that reflows: 53px of text in a
  // fixed element the rest of the page does not depend on.
  useGSAP(
    () => {
      const el = wordmarkRef.current
      if (!el) return
      if (!wordmarkWidth.current) wordmarkWidth.current = el.scrollWidth
      const width = collapsed ? 0 : wordmarkWidth.current
      if (prefersReducedMotion()) {
        gsap.set(el, { width })
        return
      }
      gsap.to(el, { width, duration: DURATION.medium, ease: EASE })
    },
    { dependencies: [collapsed] }
  )

  // Asked at the moment of the event, not on mount: a device can gain or
  // lose a pointer (a tablet with a trackpad plugged in), and there is no
  // state to keep in step.
  const canHover = () => window.matchMedia('(hover: hover)').matches

  const moveTo = (item: HTMLElement) => {
    const pill = pillRef.current
    if (!pill) return
    setHovered(true)
    const to = { x: item.offsetLeft, width: item.offsetWidth }
    if (prefersReducedMotion()) {
      gsap.set(pill, to)
      return
    }
    gsap.to(pill, { ...to, duration: DURATION.fast, ease: EASE, overwrite: true })
  }
  const leave = () => {
    const pill = pillRef.current
    if (!pill) return
    setHovered(false)
    if (prefersReducedMotion()) {
      gsap.set(pill, { width: 0 })
      return
    }
    gsap.to(pill, { width: 0, duration: DURATION.fast, ease: EASE, overwrite: true })
  }

  const theme = overFaq ? 'light' : overHero ? 'dark' : 'light'
  const itemClass =
    'ld-nav-item relative z-1 flex h-11 items-center px-5 text-[15px] bg-card text-foreground outline-none'

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      data-nav-theme={theme}
      data-nav-hover={hovered}
      className="fixed left-1/2 top-4 z-10 -translate-x-1/2"
      onPointerLeave={(e) => { if (e.pointerType !== 'touch' && canHover()) leave() }}
      onBlur={(e) => {
        if (!navRef.current?.contains(e.relatedTarget as Node)) leave()
      }}
    >
      <div className="ld-nav-ring relative flex items-center gap-0.5 p-1.5">
        {/* The shared pill. It only ever has a width while a pointer or focus
            is inside the nav, and it sits under the items. */}
        <span
          ref={pillRef}
          aria-hidden
          className="ld-nav-pill pointer-events-none absolute left-1.5 top-1.5 h-11 w-0 rounded-[12px] bg-card"
        />
        <Link
          href="/"
          aria-label="Run home"
          className={cn(itemClass, 'gap-2.5 pl-4')}
          onPointerEnter={(e) => { if (e.pointerType !== 'touch' && canHover()) moveTo(e.currentTarget) }}
          onFocus={(e) => moveTo(e.currentTarget)}
        >
          <Image src="/run-icon.png" alt="" width={22} height={22} className="ld-nav-mark rounded-sm" priority />
          <span ref={wordmarkRef} className="ld-nav-wordmark inline-block overflow-hidden whitespace-nowrap">
            Run
          </span>
        </Link>
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(itemClass, 'max-md:hidden')}
            onPointerEnter={(e) => { if (e.pointerType !== 'touch' && canHover()) moveTo(e.currentTarget) }}
            onFocus={(e) => moveTo(e.currentTarget)}
          >
            {item.label}
          </a>
        ))}
        <Link
          href="/login"
          className={cn(itemClass, 'ld-nav-login backdrop-blur-lg')}
          onPointerEnter={(e) => { if (e.pointerType !== 'touch' && canHover()) moveTo(e.currentTarget) }}
          onFocus={(e) => moveTo(e.currentTarget)}
        >
          Log in
        </Link>
      </div>
    </nav>
  )
}
