import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'

// The service-role client, for code that acts on the system's own behalf
// rather than a signed-in person's: the usage ledger, knowledge loading,
// session resets, and the routines runner (a cron tick has no JWT, and RLS
// is auth.uid()-based everywhere).
//
// Null when the env is not configured, so callers degrade instead of
// throwing during a build or a misconfigured deploy. Never import this into
// anything reachable from the client bundle.
export function createServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}
