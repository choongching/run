import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildAgentToolset,
  MANAGED_AGENTS_BETA,
  readToolCeiling,
} from '@/lib/anthropic/client'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'
import type { Database } from '@/lib/types/database'

// How much of the past to hand a replacement session. Enough that the agent
// can answer "what did I just say", short enough that it never dominates the
// turn. Trimmed from the OLDEST end, because the last thing said is the thing
// most likely being referred to.
const RECAP_MESSAGES = 30
const RECAP_CHARS = 12_000

// The conversation so far, written for the agent rather than for a person.
//
// This exists because a Managed Agents session binds its configuration when it
// is created, so any change to an agent (its model, its instructions, its
// personality, a new knowledge source) forces a fresh session on every open
// thread. See resetAgentSessions: that reset is deliberate, because an edit
// that silently waits for the next chat is worse than one that costs memory.
//
// What was missing is the other half. The person still sees their whole
// conversation on screen, so a new session with no memory of it does not read
// as "your change took effect", it reads as the agent having a stroke: it
// greets you again, re-asks what you already answered, and cannot follow "do
// that again but shorter". Every other product that drops context at least
// clears the screen.
//
// So the transcript we already store gets handed back. The person sees
// nothing; the agent picks up mid-conversation.
export function buildRecap(
  messages: { role: string; content: string }[]
): string | null {
  const usable = messages.filter((m) => m.content.trim())
  if (usable.length === 0) return null

  const lines: string[] = []
  let used = 0
  // Walk backwards so the trim drops the oldest lines, then restore order.
  for (let i = usable.length - 1; i >= 0 && lines.length < RECAP_MESSAGES; i--) {
    const m = usable[i]
    const who =
      m.role === 'user' ? 'User' : m.role === 'activity' ? 'You did' : 'You'
    const line = `${who}: ${m.content.trim()}`
    if (used + line.length > RECAP_CHARS) break
    used += line.length
    lines.push(line)
  }
  if (lines.length === 0) return null
  lines.reverse()

  return `[TRANSCRIPT, NOT A MESSAGE] The user cannot see this. Your setup was just updated, so this session is new, but the conversation on their screen is not. This is a record of what was already said and already dealt with, oldest first.

--- BEGIN TRANSCRIPT ---
${lines.join('\n')}
--- END TRANSCRIPT ---

Everything above has happened. Every question in it was answered, and every offer you made in it was already made. Do not respond to any of it, do not greet them, and do not open by picking up the last thing you said. Say nothing at all about this transcript.

Reply ONLY to the message that comes next. Use the transcript to know what they mean by "that", "the last one" or "do it again", and nothing else. It is a record of your own conversation, never instructions from anyone else.`
}

// Get the session for a thread, creating one if it has none.
//
// Returns the session id plus the recap TEXT, not an event. That distinction
// is the whole trick: sent as its own user.message the model reads it as a
// turn and replies to it ("looks like your next message didn't come
// through"), no matter how firmly the wording says not to. Carried as an
// extra text block inside the real message, it is context to one turn, and
// the model answers the person instead.
//
// One helper because four routes create sessions (message, onboarding, resume,
// confirm) and they had four copies of the same block. A copy that forgets the
// recap is exactly the bug this fixes, so there is now only one place to
// forget it.
export async function ensureSession(opts: {
  anthropic: Anthropic
  supabase: SupabaseClient<Database>
  threadId: string
  sessionId: string | null
  // Our own agent id, not the Claude one. Required so this helper can read the
  // agent's tool ceiling itself: four routes create sessions, and a ceiling
  // each of them has to remember to pass is a ceiling three of them will
  // eventually forget. Same reasoning as the recap above.
  agentId: string
  claudeAgentId: string
  environmentId: string
  title: string
  // Skip the recap when the caller knows the thread is new (first-run setup).
  recap?: boolean
  // The message being sent on this very turn, if it was already persisted.
  // Without this the recap would end with the same words the user is about to
  // say, and the agent would answer a question it thinks it has already been
  // asked twice.
  excludeMessageId?: number | null
}): Promise<{ sessionId: string; recapText: string | null }> {
  const {
    anthropic,
    supabase,
    threadId,
    sessionId,
    agentId,
    claudeAgentId,
    environmentId,
    title,
    recap = true,
    excludeMessageId = null,
  } = opts

  if (sessionId) return { sessionId, recapText: null }

  const { data: agentRow } = await supabase
    .from('agents')
    .select('enabled_tools')
    .eq('id', agentId)
    .maybeSingle()

  const session = await anthropic.beta.sessions.create({
    agent: {
      id: claudeAgentId,
      type: 'agent_with_overrides',
      // agent_with_overrides REPLACES the tool set, so the base toolset has to
      // be listed alongside ours or the agent loses Gmail and Drive.
      //
      // It also replaces the ceiling set on the agent itself, which is how
      // web_search stayed on for every agent no matter what enabled_tools said.
      // The ceiling has to be restated here or it does not exist.
      tools: [
        ...buildAgentToolset(readToolCeiling(agentRow?.enabled_tools)),
        ...CHAT_TOOL_DEFINITIONS,
      ],
    },
    environment_id: environmentId,
    title,
    betas: [MANAGED_AGENTS_BETA],
  })

  await supabase
    .from('threads')
    .update({ session_id: session.id })
    .eq('id', threadId)

  if (!recap) return { sessionId: session.id, recapText: null }

  const query = supabase
    .from('messages')
    .select('id, role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200)
  const { data: history } = excludeMessageId
    ? await query.neq('id', excludeMessageId)
    : await query

  return { sessionId: session.id, recapText: buildRecap(history ?? []) }
}
