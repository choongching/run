import { safeHost } from '@/lib/favicon'

// The favicon proxy.
//
// WHY THIS EXISTS AT ALL, since the cheap version is one line of client code:
// pointing an <img> at Google's favicon service, or at the source itself,
// tells somebody else every domain a person's agent surfaced, tied to their
// IP. Run's Security FAQ makes a point of naming exactly what leaves, while an
// agent is reading someone's inbox. So the browser only ever talks to us, and
// we do the fetching.
//
// THIS IS THE MOST DANGEROUS ROUTE IN THE APP and it is worth saying so at the
// top. A server that fetches a host the caller names is server-side request
// forgery by default: our server can reach cloud metadata endpoints and the
// private network, and a browser cannot. Every restriction below is load
// bearing. If you relax one, re-read this comment first.
//
// It is deliberately NOT user-scoped, unlike almost everything else in
// app/api. It returns a public brand image and nothing about the caller, it
// takes no input beyond a hostname, and requiring a session would defeat CDN
// caching, which is the whole performance story. It is a third documented
// exception alongside the routines tick and the Telegram webhook, and it is
// the only one that is safe to leave open, because there is nothing behind it
// to reach.

// Small: a favicon is a few kilobytes. Anything larger is not a favicon and we
// are not going to relay it.
const MAX_BYTES = 100_000
const TIMEOUT_MS = 3_000
// A week at the CDN. Favicons change on the order of years, and this is the
// cache: no storage of our own, no cleanup job, and Vercel's edge dedupes
// every reader of the same domain onto one origin fetch.
const CACHE = 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400'

// Identify ourselves honestly rather than impersonating a browser. Some CDNs
// refuse a client that sends no User-Agent at all, which is why several real
// sites returned nothing before this existed. A few will still refuse a named
// bot, and that is their right: those readers get the globe glyph.
const UA = 'RunFavicons/1.0 (+https://tryrun.today)'

// No icon: a 404, NOT a transparent pixel.
//
// The first version answered 200 with a 1x1 GIF, reasoning that a browser
// should never paint a broken image. That was wrong, and the chip proved it
// live: a 200 means the <img> loads successfully, so `onError` never fires,
// the globe fallback never appears, and every site that refuses us renders as
// an empty circle. Nothing looks broken and nothing is right.
//
// A 404 is what lets the component do its job. React swaps in the glyph, so no
// broken-image icon is ever painted anyway. Cached briefly, because a site
// with no favicon today may have one next month.
function noIcon(): Response {
  return new Response(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}

export async function GET(request: Request) {
  const host = safeHost(new URL(request.url).searchParams.get('host'))
  // A refused hostname gets the blank rather than an error. The caller is an
  // <img>, which can do nothing with a 400, and an attacker probing what we
  // will and will not fetch learns nothing from a uniform answer.
  if (!host) return noIcon()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // Fixed scheme and fixed path. The caller chooses the host and nothing
    // else, so there is no way to point this at an arbitrary URL.
    //
    // `redirect: 'manual'` matters as much as the hostname check: following
    // redirects automatically would let a domain we approved hand us off to
    // 169.254.169.254 or anything else inside the network. One hop, and the
    // new host has to pass exactly the same test.
    let res = await fetch(`https://${host}/favicon.ico`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { Accept: 'image/*', 'User-Agent': UA },
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return noIcon()
      let next: URL
      try {
        next = new URL(location, `https://${host}/`)
      } catch {
        return noIcon()
      }
      if (next.protocol !== 'https:') return noIcon()
      if (!safeHost(next.hostname)) return noIcon()
      res = await fetch(next, {
        redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'image/*', 'User-Agent': UA },
      })
    }

    if (!res.ok || !res.body) return noIcon()

    // Only images come back out. Without this the route would happily relay
    // whatever a host chose to serve at that path, including HTML, which is
    // how a proxy becomes an open redirect for content.
    const type = (res.headers.get('content-type') ?? '').toLowerCase()
    const isImage =
      type.startsWith('image/') ||
      // Plenty of real sites serve favicon.ico as this.
      type.startsWith('application/octet-stream')
    if (!isImage) return noIcon()

    const declared = Number(res.headers.get('content-length') ?? '0')
    if (declared > MAX_BYTES) return noIcon()

    // Buffered rather than streamed, deliberately: a declared length can lie,
    // and this is the only place we can enforce the real one. A favicon is
    // small enough that holding it costs nothing.
    const buffer = new Uint8Array(await res.arrayBuffer())
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return noIcon()

    return new Response(buffer, {
      status: 200,
      headers: {
        // Our own value, never the upstream header, so a host cannot talk us
        // into serving something as text/html.
        'Content-Type': type.startsWith('image/') ? type : 'image/x-icon',
        'Cache-Control': CACHE,
        'X-Content-Type-Options': 'nosniff',
        // A favicon is decoration; nothing should be able to frame this or
        // read it cross-origin as data.
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch {
    // Timeouts, DNS failures, TLS failures, a host that simply has no favicon.
    // All of them are the same to a reader: no icon, show the glyph.
    return noIcon()
  } finally {
    clearTimeout(timer)
  }
}
