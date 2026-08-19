import type { Recency } from './limits'

// One result, reduced to what the model needs to decide whether to open it.
// Deliberately not the provider's shape: adapters project into this so a
// provider swap never reaches the tool, the prompt, or the transcript.
export type SearchHit = {
  title: string
  url: string
  snippet: string
  // ISO date when the provider reports one. Brave gives page_age, Jina gives a
  // date on some results and nothing on others. Absent is normal, not an error.
  publishedAt?: string
}

export type SearchOptions = {
  count: number
  // Absent means "the whole index". A provider that cannot express a window
  // ignores it rather than failing, and says so through `recencyApplied`.
  recency?: Recency
  signal?: AbortSignal
}

export type SearchResult = {
  hits: SearchHit[]
  // Whether the recency window the model asked for was actually applied. Jina
  // has no such parameter, so an agent asking for "this week" through Jina gets
  // the whole index back. The tool tells the model rather than pretending.
  recencyApplied: boolean
}

export type ProviderId = 'brave' | 'jina'

export type SearchProvider = {
  id: ProviderId
  search(query: string, opts: SearchOptions): Promise<SearchResult>
}
