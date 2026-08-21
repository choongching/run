'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'

// A site's own mark, in a circle, with a globe when we cannot get one.
//
// Its own file because both the chip and the card behind it need exactly this,
// and importing it from one into the other would make the two files depend on
// each other in a circle.
//
// The box is its final size before the image exists, so a favicon arriving late
// during a stream cannot reflow the paragraph around it.
export function SourceFavicon({ host, px }: { host: string; px: number }) {
  const [failed, setFailed] = useState(false)
  const box = { width: px, height: px }

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={box}
    >
      {failed ? (
        // Globe, and not for want of alternatives: earth, link, link-2 and
        // circle-dashed were all rendered at this size and rejected. Earth's
        // continents turn to noise this small, both links say "a link" when the
        // chip already IS one and the glyph should say what it points AT, and a
        // dashed circle reads as loading rather than unknown.
        //
        // The deciding argument is not taste: Chrome, Safari and Firefox all
        // show a globe for a site with no favicon, so a reader already knows
        // this shape means "a website we could not identify" without being
        // taught.
        //
        // Full muted rather than muted/70: at this size the lighter weight read
        // as a smudge next to type of the same colour. Stroke 2.25 for the same
        // reason, since Lucide's default 2 thins out here.
        <Globe
          className="text-muted-foreground"
          style={box}
          strokeWidth={2.25}
          aria-hidden
        />
      ) : (
        // Through our own route, never the source and never a favicon service:
        // either of those would tell somebody else which domains this person's
        // agent surfaced. See app/api/favicon/route.ts.
        //
        // Plain img rather than next/image: the domains are arbitrary, so there
        // is no remotePatterns list that could ever cover them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/favicon?host=${encodeURIComponent(host)}`}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="object-contain"
          style={box}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
