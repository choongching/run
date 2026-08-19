// The rules for a web search. Client-safe (no server imports) so the tool, the
// run loop, and anything that eventually shows a limit in the UI size things
// the same way.
//
// Every number here follows from one fact: a search result is text we hand to
// the model, and model context is roughly a hundred times more expensive per
// token than the search that produced it. So the caps are about what reaches
// the prompt, not about what the provider is willing to send.

// Results per search. Five is what a person scans before picking, and it is
// what the model needs to choose one or two pages worth reading. Providers will
// return more (Brave up to 20, Jina 10); this is the ceiling we apply after.
export const MAX_RESULTS = 5

// Characters of snippet kept per result, applied AFTER sanitising rather than
// before, so a stripped snippet is not silently shorter than its neighbours.
// Roughly 75 tokens: enough to judge whether a page is worth opening, far too
// little to answer from without opening it, which is the behaviour we want.
export const MAX_SNIPPET_CHARS = 300

// Searches one drain of a turn may perform. A person asking a broad question
// reasonably needs three or four; six is generous and still bounded. This is a
// loop-breaker, not the real cost control: the monthly allowance is that.
export const MAX_SEARCHES_PER_DRAIN = 6

// How far back a search may be restricted. The model chooses per query, because
// the right answer differs by question: a news question wants the past week, a
// product comparison wants the whole index because the good review is a year
// old. Verified on 2026-08-18: a freshness window fixed the news query and
// destroyed the shopping one.
export const RECENCY_WINDOWS = ['week', 'month', 'year'] as const
export type Recency = (typeof RECENCY_WINDOWS)[number]

export function isRecency(value: unknown): value is Recency {
  return (
    typeof value === 'string' && (RECENCY_WINDOWS as readonly string[]).includes(value)
  )
}
