import { MAX_RESULTS, type Recency } from './limits'
import { sanitizeSnippet, sanitizeTitle, safeUrl } from './sanitize'
import type { SearchOptions, SearchProvider, SearchResult } from './types'

// Brave Search. The platform default since 2026-08-18, chosen on one capability
// rather than on price: it can restrict results to a time window and Jina
// cannot. Measured that day, the same news query returned this week's AP and
// CNN copy through Brave and months-old pages through Jina.
//
// Server-only. Never import this from a client component: the platform key is
// read here.
//
// https://api.search.brave.com/res/v1/web/search

const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

// Brave's own vocabulary for a time window. `pd` (past day) exists too and is
// deliberately not offered: a day is narrow enough that an agent asking for
// "recent" news would routinely get nothing back, which reads as a broken
// agent rather than an empty window.
const FRESHNESS: Record<Recency, string> = {
  week: 'pw',
  month: 'pm',
  year: 'py',
}

// What Brave actually returns, reduced to the fields we read. Everything is
// optional because a search API is a third party and a missing field must
// degrade a result rather than throw a turn away.
type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string
      url?: string
      description?: string
      page_age?: string
      age?: string
    }>
  }
}

export type BraveTransport = (url: URL) => Promise<unknown>

// The transport is injected so the same parsing serves both paths: our platform
// key over a direct fetch, and a user's own key through the Pipedream proxy,
// where the key never reaches us. Parsing a provider's shape and holding a
// credential are different jobs and they do not belong in the same function.
export function braveProvider(transport: BraveTransport): SearchProvider {
  return {
    id: 'brave',
    async search(query: string, opts: SearchOptions): Promise<SearchResult> {
      const url = new URL(ENDPOINT)
      url.searchParams.set('q', query)
      // Ask for a few more than we keep. Results are dropped locally when a url
      // will not parse, and asking for exactly five would then return four.
      url.searchParams.set('count', String(Math.min(MAX_RESULTS + 5, 20)))
      if (opts.recency) url.searchParams.set('freshness', FRESHNESS[opts.recency])

      const raw = (await transport(url)) as BraveResponse
      const rows = raw?.web?.results ?? []

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
          ...(row.page_age ? { publishedAt: row.page_age } : {}),
        })
        if (hits.length >= Math.min(opts.count, MAX_RESULTS)) break
      }

      return { hits, recencyApplied: Boolean(opts.recency) }
    },
  }
}

// Our own key, over a plain fetch. Used when nobody has connected their own
// search account, and the only path that spends money we are billed for.
export function bravePlatformTransport(apiKey: string, signal?: AbortSignal): BraveTransport {
  return async (url) => {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) {
      // The status is enough. The body can carry provider prose that would end
      // up in front of the model, and lib/tools/execute.ts already strips
      // machine detail out of tool errors for the same reason.
      throw new Error(`Brave search failed with status ${res.status}`)
    }
    return res.json()
  }
}
