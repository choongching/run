import { createClient } from '@supabase/supabase-js'

import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import type { Database } from '@/lib/types/database'

// The shared Managed Agents runtime every chat session runs in.
//
// This used to be created by hand from an admin page, which meant a new user's
// very first message died with "ask an admin to set up the runtime". That is a
// dead end on the first turn of a self-serve product, and the environment is
// not a user-facing concept in the first place: it is one platform resource
// that nobody needs to know exists. So it provisions itself on first use.
//
// Service-role, because company_settings is admin-writable by policy and this
// is a system operation with no user decision in it.

export type EnvironmentResult =
  | { ok: true; environmentId: string }
  | { ok: false; reason: string }

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function ensureEnvironment(): Promise<EnvironmentResult> {
  const supabase = adminClient()
  if (!supabase) {
    return { ok: false, reason: 'Run is still finishing your workspace setup.' }
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('id, anthropic_environment_id')
    .not('id', 'is', null)
    .limit(1)
    .single()

  if (!settings) {
    return { ok: false, reason: 'Run is still finishing your workspace setup.' }
  }
  if (settings.anthropic_environment_id) {
    return { ok: true, environmentId: settings.anthropic_environment_id }
  }

  let environmentId: string
  try {
    const anthropic = getAnthropicClient()
    const environment = await anthropic.beta.environments.create({
      name: 'Run',
      description: 'Shared runtime for Run chat sessions',
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
      betas: [MANAGED_AGENTS_BETA],
    })
    environmentId = environment.id
  } catch {
    return {
      ok: false,
      reason: 'Run could not start your workspace just now.',
    }
  }

  // Claim the slot only if it is still empty. Two users sending their first
  // message at the same moment would otherwise each store an environment and
  // the second would overwrite the first. Whoever writes first wins, and the
  // loser adopts the winner's id rather than stranding a session on an
  // environment nobody recorded.
  const { data: claimed } = await supabase
    .from('company_settings')
    .update({ anthropic_environment_id: environmentId })
    .eq('id', settings.id)
    .is('anthropic_environment_id', null)
    .select('anthropic_environment_id')
    .maybeSingle()

  if (claimed?.anthropic_environment_id) {
    return { ok: true, environmentId: claimed.anthropic_environment_id }
  }

  const { data: current } = await supabase
    .from('company_settings')
    .select('anthropic_environment_id')
    .eq('id', settings.id)
    .single()

  return current?.anthropic_environment_id
    ? { ok: true, environmentId: current.anthropic_environment_id }
    : { ok: true, environmentId }
}
