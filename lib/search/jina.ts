import { MAX_RESULTS } from './limits'
import { sanitizeSnippet, sanitizeTitle, safeUrl } from './sanitize'
import type { SearchOptions, SearchProvider, SearchResult } from './types'

// Jina Search. Not the platform default: it has no way to ask for recent
// results, and the one agent in this product that searches is a news agent.
// It is here because it is roughly 25 times cheaper than Brave, which is the
// right trade for someone whose volume makes price matter more than freshness.
// They get it by connecting their own account.
//
// Four things measured on 2026-08-18 that the documentation gets wrong:
//   - search needs a key; only the reader (r.jina.ai) answers without one
//   - billing is a FLAT 10,000 tokens per search, not a floor that grows with
//     the pages read
//   - it returns 10 results, not the 5 the README claims
//   - x-max-tokens is rejected below 500
//
// https://s.jina.ai

const ENDPOINT = 'https://s.jina.ai/'

// A ceiling on what one search may return, and the reason we can afford to let
// an agent search at all. 500 is Jina's own minimum; below it the API answers
// 400 ParamValidationError. Snippets are far smaller than this in practice, so
// it functions as a backstop rather than a trim.
const MAX_TOKENS = '500'

type JinaResponse = {
  data?: Array<{
    title?: string
    url?: string
    description?: string
    date?: string
  }>
}

export type JinaTransport = (url: URL) => Promise<unknown>

export function jinaProvider(transport: JinaTransport): SearchProvider {
  return {
    id: 'jina',
    async search(query: string, opts: SearchOptions): Promise<SearchResult> {
      const url = new URL(ENDPOINT)
      url.searchParams.set('q', query)

      const raw = (await transport(url)) as JinaResponse
      const rows = raw?.data ?? []

      const hits = []
      for (const row of rows) {
        const clean = safeUrl(row.url)
        if (!clean) continue
        const title = sanitizeTitle(row.title ?? '')
        if (!title) continue
        hits.push({
          title,
          url: clean,
          snippet: sanitizeSnippet(row.description ?? ''),
          ...(row.date ? { publishedAt: row.date } : {}),
        })
        if (hits.length >= Math.min(opts.count, MAX_RESULTS)) break
      }

      // Always false. Jina has no freshness parameter, so a recency request is
      // dropped rather than honoured, and the tool tells the model that instead
      // of letting it believe it got this week's news. Saying nothing here is
      // how an agent confidently reports a June article as today's.
      return { hits, recencyApplied: false }
    },
  }
}

// A user's own key would normally come through the Pipedream proxy. This direct
// transport exists for the platform path and for probing, and is what Phase 0
// used. Note the headers: no-content is what keeps a search at 0.8 seconds
// instead of 13.7, and Accept: application/json is required or the endpoint
// answers in plain text.
export function jinaDirectTransport(apiKey: string, signal?: AbortSignal): JinaTransport {
  return async (url) => {
    const res = await fetch(url, {
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'X-Respond-With': 'no-content',
        'X-Max-Tokens': MAX_TOKENS,
      },
    })
    if (!res.ok) {
      throw new Error(`Jina search failed with status ${res.status}`)
    }
    return res.json()
  }
}
