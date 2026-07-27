import { createClient } from '@supabase/supabase-js'

import type { KnowledgeInput } from '@/lib/knowledge/limits'
import type { Database } from '@/lib/types/database'

// Server-side only. Loads the sources attached to an agent, in the order they
// were attached, for composing into that agent's system prompt.
//
// This reads with the service-role key on purpose. Composing an agent's prompt
// is a system operation, not a user read: the text goes into the agent's
// instructions, never back to the caller. Doing it with the caller's client
// would mean that whenever someone who is not the owner triggers a recompose
// (finishing setup on a company-visible agent, say), RLS would return nothing
// and the owner's knowledge would be silently erased from the prompt. Reading
// as the system keeps the prompt whole no matter who saved last.
//
// Attaching is still owner-only and RLS-enforced; that is where the trust
// boundary lives. Nothing here can add a source, only read what an owner
// already chose.
export async function loadAgentKnowledge(
  agentId: string
): Promise<KnowledgeInput[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return []

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })

  const { data } = await supabase
    .from('agent_knowledge')
    .select('created_at, knowledge_sources(title, content)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  if (!data) return []

  return data
    .map((row) => row.knowledge_sources)
    .filter((s): s is { title: string; content: string } => s !== null)
    .map((s) => ({ title: s.title, content: s.content }))
}
