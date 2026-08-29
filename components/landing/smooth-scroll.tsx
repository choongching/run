'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

import { gsap, ScrollTrigger } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

// Smooth scroll for the landing page only. Lenis keeps native scrolling (no
// transform wrapper), so position: fixed keeps working for the nav and the
// curtain, and ScrollTrigger is told about every scroll so the pins stay in
// step. The GSAP ticker drives Lenis rather than a second rAF loop, which is
// the wiring the reference site uses and the one that does not drift.
//
// This is not an ambient animation: nothing here runs unless a person is
// scrolling, so the page goes idle the moment they stop.
//
// Under reduced motion it does nothing at all. The page scrolls natively
// and the pinned sections lay themselves out flat in CSS.
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({ lerp: 0.2 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    ScrollTrigger.config({ ignoreMobileResize: true })

    // A resize changes every pin's start and end, and Lenis's own idea of
    // the page height. Both recalculate once per frame at most.
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        lenis.resize()
        ScrollTrigger.refresh()
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return null
}
