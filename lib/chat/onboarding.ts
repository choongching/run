import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

import { MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import type { Database, Json } from '@/lib/types/database'

// The hidden instruction that starts the first-run setup interview. The user
// never sees this; the agent's reply (intro + first question) is what shows.
export const ONBOARDING_KICKOFF = `[SETUP] This is your first conversation with the user, and they cannot see this message. Do this now:

1. Introduce yourself in one or two warm, plain sentences based on what you are for. No jargon.
2. Say you have a couple of quick questions so you can set things up well.
3. Then use the ask_user tool to interview them ONE question at a time to understand exactly what they want from you and how they want it. For each question give 3 to 6 concrete options, each with a short label and a one-line description, and set step and total so they see progress (aim for about 3 questions). Adapt each question to their previous answers.
4. Keep going until their intent and goal are clear, then stop asking and reply with one short sentence confirming what you understood and will do for them.

Write in plain, warm sentences with normal punctuation; do not use em dashes. Do not use any tool other than ask_user during setup, and do not start the actual task yet. This is setup only.`

// After the brief is saved, the agent runs the first real task. Also hidden.
export const FIRST_TASK_KICKOFF = `[SETUP COMPLETE] Setup is done and saved. Now go ahead and do the first, most useful thing the user set you up for, based on everything you just learned. If you need access to a tool that is not connected yet, ask them to connect it. Do not repeat the setup questions.`

export type SetupAnswer = { q: string; a: string }

// A fixed policy that keeps every agent in its lane. Composed into the system
// prompt (below), never shown in the editable instructions. It grounds the
// boundary in the agent's own purpose and asks it to redirect, not cold-refuse.
// The dial is deliberately generous: only clearly off-topic or random asks get
// turned away.
export const ROLE_BOUNDARY = `## Staying on task
You have a specific job, set by your instructions and any setup notes above. Stay within it.

- If the user asks for something clearly outside that job (for example general trivia, homework, jokes, coding help, or topics unrelated to what you were set up to do), do not answer it. In one warm sentence, say it is outside what you help with, then point them back to what you can do for them.
- Be generous inside your job. Anything reasonably related to your purpose is fair game; only redirect requests that are clearly off topic or random.
- Keep every redirect friendly and brief, never a cold or preachy refusal. Greetings, thanks, and small pleasantries are fine to answer normally.
- Write in plain sentences with normal punctuation. Do not use em dashes.`

// The composed system prompt is the user's base instructions followed by an
// appended policy region (setup preferences, if any, plus the role boundary),
// fenced by this sentinel. Everything from the sentinel on is generated, so it
// is stripped to recover the base for editing. The legacy "## Setup preferences"
// heading is also matched so agents saved before the sentinel still strip.
const POLICY_START = '<!-- run:policy -->'
const APPENDED_REGION = new RegExp(
  `\\n*(?:${POLICY_START}|## Setup preferences)[\\s\\S]*$`
)

// Turn the interview into a preferences block appended to the agent's
// instructions, so what the user said in setup shapes every future session.
function composeBrief(answers: SetupAnswer[]): string {
  const lines = answers
    .filter((x) => x.a.trim())
    .map((x) => `- ${x.q.trim()} -> ${x.a.trim()}`)
    .join('\n')
  return `## Setup preferences\nThe user set these when they first met you; honor them in everything you do:\n${lines}`
}

// The base instructions with the generated policy region removed. Used to show
// and edit the plain instructions in the config panel without the appended
// block leaking into the textarea.
export function stripBrief(systemPrompt: string | null): string {
  return (systemPrompt ?? '').replace(APPENDED_REGION, '').trimEnd()
}

// Compose the full system prompt: the user's base instructions, then the setup
// preferences (if any), then the always-on role boundary, under the policy
// sentinel. Strips its own input first so it is safe to pass an already
// composed prompt (re-derives cleanly). Every write of the system prompt goes
// through here so the boundary is always present.
export function buildSystemPrompt(
  baseInstructions: string,
  answers: SetupAnswer[]
): string {
  const base = stripBrief(baseInstructions)
  const kept = (answers ?? []).filter((x) => x.a?.trim())
  const sections = [kept.length ? composeBrief(kept) : '', ROLE_BOUNDARY]
    .filter(Boolean)
    .join('\n\n')
  return `${base}\n\n${POLICY_START}\n${sections}\n`
}

// Parse the preferences jsonb (or anything loose) into setup answers.
export function parseSetupAnswers(raw: unknown): SetupAnswer[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x): SetupAnswer | null => {
      const o = (x ?? {}) as Record<string, unknown>
      const q = String(o.q ?? '').trim()
      const a = String(o.a ?? '').trim()
      if (!q && !a) return null
      return { q, a }
    })
    .filter((x): x is SetupAnswer => x !== null)
}

// Persist the interview: fold the answers into the agent's instructions, store
// the structured preferences, and mark it onboarded. The Claude agent's system
// prompt is synced best-effort so future sessions use the preferences too; a
// failed sync never blocks completion because the database is the source used
// to build the next session.
export async function finalizeOnboarding(opts: {
  anthropic: Anthropic
  supabase: SupabaseClient<Database>
  agentId: string
  claudeAgentId: string | null
  claudeVersion: number | null
  baseSystemPrompt: string | null
  answers: SetupAnswer[]
}): Promise<void> {
  const { anthropic, supabase, agentId, claudeAgentId, claudeVersion, baseSystemPrompt, answers } =
    opts

  const newSystem = buildSystemPrompt(baseSystemPrompt ?? '', answers)

  await supabase
    .from('agents')
    .update({
      system_prompt: newSystem,
      preferences: answers as unknown as Json,
      onboarded: true,
    })
    .eq('id', agentId)

  if (claudeAgentId && claudeVersion != null) {
    try {
      const updated = await anthropic.beta.agents.update(claudeAgentId, {
        version: claudeVersion,
        system: newSystem,
        betas: [MANAGED_AGENTS_BETA],
      })
      await supabase
        .from('agents')
        .update({ claude_version: updated.version, synced_at: new Date().toISOString() })
        .eq('id', agentId)
    } catch {
      // Cosmetic for the current turn (this session already holds the interview
      // in context); the database instructions are what seed future sessions.
    }
  }
}
