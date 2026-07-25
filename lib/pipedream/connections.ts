import type { SupabaseClient } from '@supabase/supabase-js'

import type { ConnectableApp } from '@/lib/pipedream/client'
import type { Database } from '@/lib/types/database'

// A user's live Pipedream account id for one app, or null if not connected.
// external_user_id for the proxy is always the user's own uuid.
export async function getUserConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  app: ConnectableApp
): Promise<string | null> {
  const { data } = await supabase
    .from('user_connections')
    .select('pipedream_account_id')
    .eq('user_id', userId)
    .eq('app', app)
    .maybeSingle()
  return data?.pipedream_account_id ?? null
}
