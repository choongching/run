import { braveProvider, bravePlatformTransport } from './brave'
import type { SearchProvider } from './types'

// Which provider answers a search, and who pays for it. One place to read the
// ladder, one place to change it.
//
// Today there is one rung:
//
//   Nobody has connected anything -> our Brave key, counted against their
//   monthly allowance.
//
// Two more rungs arrive with the connectors, above this one:
//
//   The user connected their own Jina account  -> their key, their bill
//   The user connected their own Brave account -> their key, their bill
//
// They are not stubbed here on purpose. `jina_ai` and `brave_search_api` are
// not registered as connectable apps yet, and the Pipedream proxy has not been
// verified against a key-authenticated app. A branch written against an API
// shape nobody has run would sit here looking finished. When those land, they
// go in above the platform rung, and Jina goes first: it is roughly 25 times
// cheaper, so a user who connected both meant the cheap one.
//
// Server-only. Reads the platform key.

export type Resolved = {
  provider: SearchProvider
  // True only when we are the ones being billed. Drives both the monthly
  // allowance and what gets recorded as cost: a search on someone else's key
  // costs us nothing and does not belong in our ledger.
  billedToUs: boolean
}

export class SearchUnavailableError extends Error {}

// Named and thrown rather than returned, because a missing platform key is a
// deployment mistake, not a user-facing state. Same shape as
// getPipedreamClient, which throws for the same reason.
function platformKey(): string {
  const key = process.env.BRAVE_API_KEY
  if (!key) {
    throw new SearchUnavailableError('BRAVE_API_KEY is not set')
  }
  return key
}

export function resolveProvider(signal?: AbortSignal): Resolved {
  return {
    provider: braveProvider(bravePlatformTransport(platformKey(), signal)),
    billedToUs: true,
  }
}
