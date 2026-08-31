'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import { prefersReducedMotion } from '@/lib/landing/motion'

// Drop clips here and they play. Muted H.264 MP4, 10 to 20 seconds each,
// a few megabytes at most: the first one is on the critical path of the
// front page. Any that are missing are skipped; with none present the
// photograph stands alone; with one, it loops on its own.
const CLIPS = ['/landing/hero-1.mp4']
const CROSSFADE_MS = 900

// The hero's background: a set of clips played one after another, each
// crossfading into the next, the set looping. This is the one perpetual
// motion on the page, and it is here because the reference's hero is a
// looping video and the founder asked for the same (2026-08-29). What
// makes it defensible is written into the code rather than argued:
//
//   - it plays only while the hero is on screen (spec 3.4), so it costs
//     nothing once you have scrolled past;
//   - a hidden tab pauses it (browsers do this for video on their own,
//     and it is also done here explicitly);
//   - under prefers-reduced-motion nothing plays and the photograph shows;
//   - the photograph is the poster, so the first paint never waits on it.
//
// Two <video> elements take turns: while one plays, the next clip is
// loaded behind it, and at the end the other fades in over it.
// `lazy` holds the clips back until the frame is within a viewport of the
// screen, for footage far down the page: the closing banner's clip is a
// megabyte and was loading with the hero's.
export function HeroMedia({ sources = CLIPS, lazy = false }: { sources?: string[]; lazy?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(!lazy)
  const [available, setAvailable] = useState<string[] | null>(() =>
    typeof window !== 'undefined' && prefersReducedMotion() ? [] : null
  )
  const nearRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = nearRef.current
    if (near || !el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '100% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  // Which slot is in front, and which clip each slot holds.
  const [front, setFront] = useState(0)
  const [clips, setClips] = useState<[number, number]>([0, 1])

  // Find out which clips exist, once, without downloading them.
  useEffect(() => {
    if (available !== null || !near) return
    let cancelled = false
    Promise.all(
      sources.map((src) =>
        fetch(src, { method: 'HEAD' })
          .then((r) => (r.ok && (r.headers.get('content-type') ?? '').startsWith('video') ? src : null))
          .catch(() => null)
      )
    ).then((found) => {
      if (!cancelled) setAvailable(found.filter((s): s is string => s !== null))
    })
    return () => {
      cancelled = true
    }
  }, [available, near, sources])

  // The front video plays while the hero is on screen and the tab is
  // visible, and pauses otherwise: the hero scrolls away under the rest
  // of the page and there is no reason to keep decoding frames.
  useEffect(() => {
    const el = wrap.current
    if (!el || !available?.length) return
    const video = el.querySelectorAll('video')[front]
    if (!video) return
    let onScreen = true
    const sync = () => {
      if (onScreen && !document.hidden) video.play().catch(() => {})
      else video.pause()
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [available, front])

  if (available === null || available.length === 0) {
    return lazy && !near ? <div ref={nearRef} aria-hidden className="absolute inset-0" /> : null
  }

  const onEnded = () => {
    const back = 1 - front
    // The back slot already holds the next clip; after the swap it becomes
    // the front, and the old front is given the clip after that.
    const after = (clips[back] + 1) % available.length
    const el = wrap.current
    const next = el?.querySelectorAll('video')[back]
    if (next) {
      next.currentTime = 0
      next.play().catch(() => {})
    }
    setClips(front === 0 ? [after, clips[1]] : [clips[0], after])
    setFront(back)
  }

  return (
    <div ref={wrap} aria-hidden className="absolute inset-0">
      {(available.length === 1 ? [0] : [0, 1]).map((slot) => (
        <video
          key={slot}
          src={available[clips[slot] % available.length]}
          muted
          playsInline
          preload={slot === front ? 'auto' : 'metadata'}
          autoPlay={slot === front}
          loop={available.length === 1}
          onEnded={slot === front ? onEnded : undefined}
          className="absolute inset-0 h-full w-full object-cover transition-opacity ease-out"
          style={{ opacity: slot === front ? 1 : 0, transitionDuration: `${CROSSFADE_MS}ms` }}
        />
      ))}
    </div>
  )
}

// The still that is there before, under, and instead of the video.
export function HeroPoster({ src = '/landing/hero-poster.webp', priority = true }: { src?: string; priority?: boolean }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      fetchPriority={priority ? 'high' : undefined}
      sizes="100vw"
      className="object-cover opacity-90"
    />
  )
}
