import type { SupabaseClient } from '@supabase/supabase-js'

import { getUserConnection } from '@/lib/pipedream/connections'
import type { Database } from '@/lib/types/database'
import { braveProvider, bravePlatformTransport } from './brave'
import { jinaProvider, jinaProxyTransport } from './jina'
import type { SearchProvider } from './types'

// Which provider answers a search, and who pays for it. One place to read the
// ladder, one place to change it.
//
//   1. The user connected their own Jina account -> their key, their bill,
//      no cap.
//   2. Nobody connected anything -> our Brave key, counted against their
//      monthly allowance.
//
// There is no third rung for a user's own Brave account, and that is a finding
// rather than an omission. Pipedream's app metadata, read on 2026-08-18,
// reports `brave_search_api` with `proxy_enabled: false`: the proxy will not
// carry it, so their key could only reach Brave by passing through us, and
// holding someone's API key is the one thing this design exists to avoid.
// `jina_ai` reports `proxy_enabled: true` with `s.jina.ai` allowed, which is
// exactly the endpoint our adapter calls.
//
// It also lands the right way round economically. Jina is roughly 25 times
// cheaper, so "bring your own account" is the cheap one, and the one we pay for
// is the one that can answer "this week".
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

// Which provider WOULD answer, without building one or needing the platform
// key. The transcript uses this to put the right mark on a search step, and a
// step showing Brave's lion to someone whose searches run on their own Jina
// account would be a small lie told many times.
export async function resolveProviderId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<'brave' | 'jina'> {
  const accountId = await getUserConnection(supabase, userId, 'jina_ai')
  return accountId ? 'jina' : 'brave'
}

export async function resolveProvider(args: {
  supabase: SupabaseClient<Database>
  userId: string
  signal?: AbortSignal
}): Promise<Resolved> {
  const accountId = await getUserConnection(args.supabase, args.userId, 'jina_ai')
  if (accountId) {
    return {
      provider: jinaProvider(
        jinaProxyTransport({ userId: args.userId, accountId })
      ),
      billedToUs: false,
    }
  }

  return {
    provider: braveProvider(bravePlatformTransport(platformKey(), args.signal)),
    billedToUs: true,
  }
}
