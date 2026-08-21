import type { SearchHit } from '@/lib/search/types'

// What a message remembers about where it came from.
//
// Until now a search hit lived and died inside one tool call: the provider
// returned a title, url, snippet and sometimes a date, we formatted it into
// text for the model, and threw the structure away. The message kept the
// model's prose and nothing else.
//
// That made every source feature impossible to build honestly. A chip can be
// derived from a link the model happened to write, but "4 sources" cannot: in
// a real report Business Insider was named twice in the prose with no link at
// all, so a count built from links would have said two where a reader counts
// four. A count that undercounts is worse than no count.
//
// STORED AS JSONB ON THE MESSAGE, not as a table. Sources are only ever read
// with the message they belong to, and the chat page is deliberately two
// round trips; a join would make it three and undo a measured optimisation to
// normalise data nothing queries across rows. Same reasoning, and the same
// shape, as `attachments`.

// WHAT THIS IS AND IS NOT, learned from the first real turn that wrote it.
//
// These are the hits the agent's searches RETURNED, not the ones it used. A
// search for "recent AI chip story" came back with four on-topic results and
// one live politics blog that merely mentioned datacenters; the agent ignored
// the last one and wrote about the other four. We stored all five, because at
// the moment a search returns there is no way to know which the model will
// lean on: it never tells us, and it frequently uses a result without linking
// it.
//
// So a count built from this is "what it looked at", never "what it cited",
// and the UI must not claim otherwise. Labelling five results as "5 sources"
// would overclaim in exactly the way a link-derived count underclaimed. The
// popover should say what is true: these are the pages behind the answer, in
// the order the search returned them.
export type MessageSource = {
  url: string
  title: string
  // Absent when the provider gave nothing usable. An empty snippet is fine;
  // the card simply shows less.
  snippet?: string
  // ISO date, when the provider reports one. Brave gives page_age, Jina gives
  // a date on some results and nothing on others, so absent is normal. This is
  // the field that fills the slot where Perplexity puts a "Trusted" badge: a
  // real date beats a verdict we have no basis to issue.
  publishedAt?: string
}

// Bounds. A row that grows without a ceiling is a slow outage: this is read on
// every chat page load, and one runaway turn should not make a thread heavy
// forever.
const MAX_SOURCES = 12
const MAX_SNIPPET = 280
const MAX_TITLE = 200

// Hits arrive from the provider, so treat them as untrusted length-wise even
// though sanitize.ts has already stripped their content.
export function toMessageSources(hits: SearchHit[]): MessageSource[] {
  const seen = new Set<string>()
  const out: MessageSource[] = []

  for (const hit of hits) {
    if (out.length >= MAX_SOURCES) break

    // A url that will not parse cannot be a chip, a link, or a favicon
    // lookup, so it has no use downstream.
    let url: URL
    try {
      url = new URL(hit.url)
    } catch {
      continue
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue

    // Deduped on the url without its fragment: several searches in one turn
    // routinely return the same page, and the same page twice reads as two
    // sources.
    url.hash = ''
    const key = url.toString()
    if (seen.has(key)) continue
    seen.add(key)

    const title = hit.title.trim().slice(0, MAX_TITLE)
    const snippet = hit.snippet?.trim().slice(0, MAX_SNIPPET)

    out.push({
      url: key,
      // Falling back to the host keeps a source usable when a provider gives
      // no title, which happens.
      title: title || url.hostname,
      ...(snippet ? { snippet } : {}),
      ...(hit.publishedAt ? { publishedAt: hit.publishedAt } : {}),
    })
  }

  return out
}

// Read back the other way, tolerantly. This is jsonb written by earlier
// versions of the app, so nothing about its shape is guaranteed.
export function parseMessageSources(raw: unknown): MessageSource[] {
  if (!Array.isArray(raw)) return []
  const out: MessageSource[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const url = typeof o.url === 'string' ? o.url : ''
    if (!url) continue
    out.push({
      url,
      title: typeof o.title === 'string' ? o.title : '',
      ...(typeof o.snippet === 'string' ? { snippet: o.snippet } : {}),
      ...(typeof o.publishedAt === 'string'
        ? { publishedAt: o.publishedAt }
        : {}),
    })
  }
  return out
}
