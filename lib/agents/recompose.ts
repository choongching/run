import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
} from '@/lib/anthropic/client'
import {
  buildSystemPrompt,
  parseSetupAnswers,
  stripBrief,
} from '@/lib/chat/onboarding'
import { loadAgentKnowledge } from '@/lib/knowledge/load'
import type { Database } from '@/lib/types/database'

// Drop the live sessions for an agent so the next turn builds a new one.
//
// A Managed Agents session binds the agent's configuration when it is CREATED
// (the same reason a session that predates a new tool never gets that tool).
// So editing the prompt updates the agent and changes nothing the user can see:
// their open chat keeps answering from the configuration it started with. That
// is the worst possible failure for a feature like knowledge, because it looks
// like the change did not work rather than like it was deferred.
//
// Clearing session_id costs the agent its in-session memory of that thread, and
// that is the honest trade: a deliberate edit taking effect now beats an edit
// that silently waits. The visible history lives in our messages table, so the
// transcript on screen is unaffected. Pending tool calls go too: they belong to
// a session that will never be resumed, and leaving them would strand the
// thread waiting on an answer it can no longer deliver.
//
// Service-role, for the same reason loadAgentKnowledge is: threads are updatable
// only by their own user (`auth.uid() = user_id`), so the caller's client would
// reset the owner's thread and silently skip everyone else's. On a
// company-visible agent that means the other members keep answering from the
// configuration the owner just changed, which is the exact bug this function
// exists to prevent. Reaching every thread is the whole point.
export async function resetAgentSessions(
  _supabase: SupabaseClient<Database>,
  agentId: string
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: threads } = await admin
    .from('threads')
    .update({ session_id: null, pending_tools: null })
    .eq('agent_id', agentId)
    .select('id')

  // Say so in the conversation. The session is replaced and handed a recap of
  // what was said (see ensureSession), so nothing is actually lost, but the
  // agent IS different from this point: new instructions, maybe a new model.
  // A quiet line marking where that happened is the difference between "it
  // changed when I asked it to" and an agent that inexplicably answers in a
  // new voice halfway down a page.
  //
  // Only in threads that have already been used: a brand new agent has no
  // "from here" to mark.
  for (const t of threads ?? []) {
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', t.id)
    if ((count ?? 0) === 0) continue
    await admin.from('messages').insert({
      thread_id: t.id,
      role: 'activity',
      content: '',
      payload: { notice: 'Updated. Your agent uses the new setup from here.' },
    })
  }
}

// Rebuild an agent's system prompt from its current parts and save it.
//
// Knowledge changes have to reach the prompt somehow, and the agent-prompt
// contract says every write of `system` goes through buildSystemPrompt. Rather
// than repeat that composition in each knowledge action, they all call this: it
// re-derives the base instructions, folds in the saved setup answers, the
// personality, and the freshly loaded knowledge, then writes it.
//
// Owner-scoped, like the other agent mutations. The Anthropic sync is
// best-effort on purpose: the database is what seeds the next session, so a
// version conflict must never lose the user's change.
export async function recomposeAgentPrompt(
  supabase: SupabaseClient<Database>,
  agentId: string,
  userId: string
): Promise<void> {
  const { data: agent } = await supabase
    .from('agents')
    .select('system_prompt, preferences, personality, claude_agent_id, claude_version')
    .eq('id', agentId)
    .eq('owner_id', userId)
    .single()
  if (!agent) return

  const knowledge = await loadAgentKnowledge(agentId)
  const system = buildSystemPrompt(
    stripBrief(agent.system_prompt),
    parseSetupAnswers(agent.preferences),
    agent.personality,
    knowledge
  )

  await supabase
    .from('agents')
    .update({ system_prompt: system })
    .eq('id', agentId)
    .eq('owner_id', userId)

  // The point of saving is that the next message behaves differently.
  await resetAgentSessions(supabase, agentId)

  if (agent.claude_agent_id && agent.claude_version != null) {
    try {
      const anthropic = getAnthropicClient()
      const updated = await anthropic.beta.agents.update(agent.claude_agent_id, {
        version: agent.claude_version,
        system,
        betas: [MANAGED_AGENTS_BETA],
      })
      await supabase
        .from('agents')
        .update({
          claude_version: updated.version,
          synced_at: new Date().toISOString(),
        })
        .eq('id', agentId)
    } catch {
      // Cosmetic sync only. The database prompt is what builds the next session.
    }
  }
}
