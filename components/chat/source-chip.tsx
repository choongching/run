'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { SourceFavicon } from '@/components/chat/source-favicon'
import {
  findSource,
  SourcePopover,
  useSources,
} from '@/components/chat/source-popover'
import { domainLabel } from '@/lib/favicon'

// A citation, as a pill rather than as prose.
//
// The old rendering was a bare underlined word inside the sentence, which
// pretends a source is part of what you are reading. A pill says the opposite:
// this is a label attached to the claim you just finished, and skipping it
// costs you nothing.
//
// Three details carry that, and all three were argued over a prototype:
//
//   The type is 10px MONO, under the 12px floor the scale sets. That is
//   deliberate. A citation is a footnote, and at 12px sans it reads as a
//   second voice competing with the sentence. Mono makes the eye file it as
//   metadata, the way it files a timestamp.
//
//   The shape is a full pill, which the radius scale otherwise reserves for
//   circles. At 19px tall a 6px radius reads as a tiny input, and the whole
//   point is that this is not a control.
//
//   The horizontal padding is larger than the height implies, because a pill's
//   edge curves furthest inward exactly at the vertical centre, which is where
//   the content sits. Padding that looks right on a rectangle reads as
//   touching on a pill. The favicon is a circle for the same reason:
//   concentric with the pill rather than arguing with it at the tightest
//   point.
//
// Both scale exceptions are founder-approved, alongside the home hero and the
// composer.
//
// Hovering one opens the card in source-popover.tsx, which is the only way to
// reach a page the agent read but never linked. That makes the card hover and
// keyboard only: on a phone the chip is still just a link. Recorded rather than
// hidden, because it is the one gap in this feature.

// Long enough that a chip crossed on the way somewhere else stays quiet, short
// enough that a chip aimed at feels instant.
const OPEN_MS = 260
// Covers the small gap between chip and card: the pointer leaves one before it
// enters the other, and the card cancels this timer on the way in.
const CLOSE_MS = 120

// The card's width, which the placement maths needs to know. It is stated in
// the card's own class too, so keep the two in step.
const CARD_W = 320
// Room the card wants above the chip before it gives up and hangs below.
const CARD_H = 220
const GAP = 6

type Placement = {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export function SourceChip({ href }: { href: string }) {
  const sources = useSources()
  const [index, setIndex] = useState(-1)
  const [place, setPlace] = useState<Placement | null>(null)
  const wrapper = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The card is positioned against the viewport, so a scroll would leave it
  // hanging over the wrong line. Closing is the honest answer, and it is what
  // someone scrolling away wanted anyway.
  useEffect(() => {
    if (!place) return
    const close = () => setPlace(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [place])

  let host: string
  try {
    host = new URL(href).hostname
  } catch {
    return null
  }

  // The chip is a link whether or not we know anything about the page behind
  // it. A reply written before we stored sources, or one where the model linked
  // a page no search returned, simply has no card.
  const found = findSource(sources, href)
  const hasCard = found !== -1

  function schedule(next: boolean) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(
      () => {
        if (!next) {
          setPlace(null)
          return
        }
        const rect = wrapper.current?.getBoundingClientRect()
        if (!rect) return
        // Opens on the page this chip points at; the arrows walk the rest.
        setIndex(found)
        setPlace({
          // A chip at the end of a line is common, and a card that always hung
          // from the left edge would run off the screen there. 16 is the gutter
          // we keep from the viewport edge.
          ...(rect.left + CARD_W > window.innerWidth - 16
            ? { right: Math.max(16, window.innerWidth - rect.right) }
            : { left: Math.max(16, rect.left) }),
          // Above by preference, because that is where the sentence it belongs
          // to is. Below when there is no room, near the top of a thread.
          ...(rect.top > CARD_H
            ? { bottom: window.innerHeight - rect.top + GAP }
            : { top: rect.bottom + GAP }),
        })
      },
      next ? OPEN_MS : CLOSE_MS
    )
  }

  return (
    <span
      ref={wrapper}
      className="relative inline-block"
      onMouseEnter={hasCard ? () => schedule(true) : undefined}
      onMouseLeave={hasCard ? () => schedule(false) : undefined}
      // Portalled content still bubbles through the React tree, so this catches
      // Escape from the chip and from the card's arrows alike.
      onKeyDown={(e) => {
        if (e.key === 'Escape') setPlace(null)
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        // Focus opens the card too, so the pages behind an answer are reachable
        // from a keyboard and not only from a mouse.
        onFocus={hasCard ? () => schedule(true) : undefined}
        onBlur={hasCard ? () => schedule(false) : undefined}
        // not-prose: the typography plugin would give this an underline, its own
        // colour and its own font size, all of which fight the design.
        className="not-prose mx-px inline-flex h-[19px] max-w-full items-center gap-[5px] rounded-full bg-muted/70 pr-[9px] pl-1 align-[1px] font-mono text-[10px] whitespace-nowrap text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
      >
        <SourceFavicon host={host} px={13} />
        {domainLabel(host)}
      </a>

      {place &&
        hasCard &&
        // Into the body rather than beside the chip. A chip lives inside a
        // paragraph and a card is a block, which is invalid html React warns
        // about, and any ancestor with hidden overflow would clip it anyway.
        // Positioned against the viewport, which is why it closes on scroll.
        createPortal(
          <div
            className="fixed z-50"
            style={place}
            // The pointer left the chip's wrapper to get here, so the card
            // holds itself open and closes on its own terms.
            onMouseEnter={() => {
              if (timer.current) clearTimeout(timer.current)
            }}
            onMouseLeave={() => schedule(false)}
          >
            <SourcePopover sources={sources} index={index} onIndex={setIndex} />
          </div>,
          document.body
        )}
    </span>
  )
}

// Whether a link should render as a chip rather than as prose.
//
// Agents write both kinds. "(CNBC)" at the end of a claim is a citation.
// "Read more at Crunchbase News" in the middle of a sentence is a sentence,
// and turning that into a pill would be wrong.
//
// Word count separates them better than length does: a citation is a name,
// usually one to three words, while a prose link is a phrase with a verb in
// it. This is a heuristic and it will occasionally be wrong in both
// directions. The alternative is instructing every agent to emit sources in a
// fixed form, which is a prompt change touching every agent in the product, so
// it is worth doing only if this proves annoying in practice.
export function isCitationLink(text: string, href: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.length > 24) return false
  if (trimmed.split(/\s+/).length > 3) return false
  // A bare url the model pasted is always a citation.
  if (/^https?:\/\//i.test(trimmed)) return true
  // Anything ending in sentence punctuation is prose that happens to be short.
  if (/[.!?,;:]$/.test(trimmed)) return false
  try {
    // Only http(s). A mailto or a relative link is never a source.
    const protocol = new URL(href).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}
