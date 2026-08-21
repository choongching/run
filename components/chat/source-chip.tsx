'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'

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

export function SourceChip({ href }: { href: string }) {
  const [iconFailed, setIconFailed] = useState(false)

  let host: string
  try {
    host = new URL(href).hostname
  } catch {
    return null
  }

  const label = domainLabel(host)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // not-prose: the typography plugin would give this an underline, its own
      // colour and its own font size, all of which fight the design.
      className="not-prose mx-px inline-flex h-[19px] max-w-full items-center gap-[5px] rounded-full bg-muted/70 pr-[9px] pl-1 align-[1px] font-mono text-[10px] whitespace-nowrap text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
    >
      {/* The box is its final size before the image exists, so a favicon
          arriving late during a stream cannot reflow the paragraph. */}
      <span className="flex size-[13px] shrink-0 items-center justify-center overflow-hidden rounded-full">
        {iconFailed ? (
          // Globe, and not for want of alternatives: earth, link, link-2 and
          // circle-dashed were all rendered at this exact size and rejected.
          // Earth's continents turn to noise at 13px, both links say "a link"
          // when the chip already IS one and the glyph should say what it
          // points AT, and a dashed circle reads as loading rather than
          // unknown.
          //
          // The deciding argument is not taste: Chrome, Safari and Firefox all
          // show a globe for a site with no favicon, so a reader already knows
          // this shape means "a website we could not identify" without being
          // taught.
          //
          // Full muted rather than muted/70: at 13px the lighter weight read
          // as a smudge next to type of the same colour. Stroke 2.25 for the
          // same reason, since Lucide's default 2 thins out at this size.
          <Globe
            className="size-[13px] text-muted-foreground"
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          // Through our own route, never the source and never a favicon
          // service: either of those would tell somebody else which domains
          // this person's agent surfaced. See app/api/favicon/route.ts.
          //
          // Plain img rather than next/image: the domains are arbitrary, so
          // there is no remotePatterns list that could ever cover them.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/favicon?host=${encodeURIComponent(host)}`}
            alt=""
            width={13}
            height={13}
            loading="lazy"
            decoding="async"
            className="size-[13px] object-contain"
            onError={() => setIconFailed(true)}
          />
        )}
      </span>
      {label}
    </a>
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
