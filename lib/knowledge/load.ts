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

  // Who owns the agent, which is whose always-on sources apply to it.
  const { data: agent } = await supabase
    .from('agents')
    .select('owner_id')
    .eq('id', agentId)
    .maybeSingle()
  if (!agent?.owner_id) return []
  const ownerId = agent.owner_id

  const [{ data: linked }, { data: everywhere }] = await Promise.all([
    supabase
      .from('agent_knowledge')
      .select('source_id, created_at, knowledge_sources(title, content)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true }),
    supabase
      .from('knowledge_sources')
      .select('id, title, content')
      .eq('owner_id', ownerId)
      .eq('applies_to_all', true)
      .order('created_at', { ascending: true }),
  ])

  // Always-on sources read first: they are the standing context (voice,
  // glossary, company facts) that the agent-specific material builds on.
  // Deduped by id, so a source that is both flagged and explicitly attached is
  // composed once rather than contradicting itself.
  const seen = new Set<string>()
  const out: KnowledgeInput[] = []

  for (const s of everywhere ?? []) {
    seen.add(s.id)
    out.push({ title: s.title, content: s.content })
  }
  for (const row of linked ?? []) {
    if (seen.has(row.source_id) || !row.knowledge_sources) continue
    seen.add(row.source_id)
    out.push({
      title: row.knowledge_sources.title,
      content: row.knowledge_sources.content,
    })
  }

  return out
}
