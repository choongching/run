import {
  buildAgentToolset,
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
} from '@/lib/anthropic/client'
import { ensureEnvironment } from '@/lib/anthropic/environment'
import { drainSession } from '@/lib/chat/run-turn'
import { getRunAllowance } from '@/lib/entitlements/assert'
import { FAILING_AFTER } from '@/lib/routines/list'
import { nextOccurrences, parseRule } from '@/lib/routines/rule'
import { createServiceClient } from '@/lib/supabase/service'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'
import type { Json } from '@/lib/types/database'

// How much of the last run's report the next run is handed. Enough for
// "since last time" to mean something, short enough that the prompt never
// grows with age.
const CARRY_CHARS = 1500

export type RunOutcome =
  | { ok: true; runId: string; headline: string | null }
  | { ok: false; reason: string }

// One scheduled (or hand-fired) run of a routine, end to end.
//
// The one architectural rule in here: a run gets a FRESH session, always,
// and never touches threads.session_id or threads.pending_tools. The thread
// has exactly one live session and one pending-approval slot, both owned by
// the open chat; a routine borrowing either would race a person mid-typing
// or clobber an approval they had not answered yet. The run's transcript
// still lands in the thread as ordinary messages, which is why the person
// sees the result exactly where they would look for it.
//
// Runs under the service role because a cron tick has no user. Every read is
// still pinned to the routine's own user_id, so a bad id cannot cross an
// account boundary.
export async function runRoutine(
  routineId: string,
  opts: { trigger: 'schedule' | 'manual' }
): Promise<RunOutcome> {
  const supabase = createServiceClient()
  if (!supabase) return { ok: false, reason: 'The runner is not configured.' }

  const { data: routine } = await supabase
    .from('routines')
    .select('id, agent_id, user_id, name, instruction, rule, status, carry, consecutive_failures, last_run_at')
    .eq('id', routineId)
    .maybeSingle()
  if (!routine) return { ok: false, reason: 'That routine is not here any more.' }

  const rule = parseRule(routine.rule)
  if (!rule) return { ok: false, reason: 'That routine has a broken schedule.' }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, status, model, claude_agent_id')
    .eq('id', routine.agent_id)
    .maybeSingle()
  if (!agent || agent.status !== 'active' || !agent.claude_agent_id) {
    // A paused or deleted agent must stop firing. Cheap to get right now,
    // embarrassing to discover later.
    await supabase
      .from('routines')
      .update({ status: 'paused_system' })
      .eq('id', routine.id)
    return { ok: false, reason: 'The agent is paused or gone, so the routine paused itself.' }
  }

  // The thread is where the result lands. One per (agent, user) by unique
  // index; upsert covers the rare case where it has never been opened.
  const { data: thread } = await supabase
    .from('threads')
    .upsert(
      { agent_id: routine.agent_id, user_id: routine.user_id },
      { onConflict: 'agent_id,user_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()
  if (!thread) return { ok: false, reason: 'The conversation could not be opened.' }

  // The meter's number, enforced here exactly as the message route enforces
  // it for chat. When it trips, the routine pauses itself and says so once,
  // rather than failing silently every morning for three weeks.
  const allowance = await getRunAllowance(supabase, routine.user_id)
  if (allowance.used >= allowance.limit) {
    await supabase
      .from('routines')
      .update({ status: 'paused_system' })
      .eq('id', routine.id)
    await supabase.from('routine_runs').insert({
      routine_id: routine.id,
      agent_id: agent.id,
      user_id: routine.user_id,
      status: 'skipped',
      finished_at: new Date().toISOString(),
      error: 'Out of runs this month',
    })
    await supabase.from('messages').insert({
      thread_id: thread.id,
      role: 'activity',
      content: '',
      payload: {
        notice: `"${routine.name}" paused itself: you have used all ${allowance.limit} runs this month. It starts again when your runs refill, or resume it sooner from Routines.`,
      } as unknown as Json,
    })
    return { ok: false, reason: 'Out of runs this month; the routine paused itself.' }
  }

  const environment = await ensureEnvironment()
  if (!environment.ok) return { ok: false, reason: environment.reason }

  const anthropic = getAnthropicClient()

  // Fresh session per run, same tool surface as chat. Deliberately NOT
  // ensureSession: that helper writes threads.session_id, which belongs to
  // the open chat alone.
  const session = await anthropic.beta.sessions.create({
    agent: {
      id: agent.claude_agent_id,
      type: 'agent_with_overrides',
      tools: [
        ...buildAgentToolset({ web_search: true }),
        ...CHAT_TOOL_DEFINITIONS,
      ],
    },
    environment_id: environment.environmentId,
    title: `${agent.name}: ${routine.name}`,
    betas: [MANAGED_AGENTS_BETA],
  })

  const { data: run } = await supabase
    .from('routine_runs')
    .insert({
      routine_id: routine.id,
      agent_id: agent.id,
      user_id: routine.user_id,
      session_id: session.id,
    })
    .select('id')
    .single()

  // The quiet line in the thread that marks where this run's messages begin,
  // same divider style as a setup change.
  await supabase.from('messages').insert({
    thread_id: thread.id,
    role: 'activity',
    content: '',
    payload: {
      notice: `Routine: ${routine.name}${opts.trigger === 'manual' ? ', run by you' : ''}`,
    } as unknown as Json,
  })

  const lastRan = routine.last_run_at
    ? new Date(routine.last_run_at).toISOString().slice(0, 10)
    : null
  const kickoff = `[SCHEDULED RUN, NOT A MESSAGE] This is a routine named "${routine.name}" firing${
    opts.trigger === 'manual' ? ' because the user pressed Run now' : ' on its schedule'
  }. The user is not present and cannot answer questions.

Your standing instruction for each run:
${routine.instruction}
${
  routine.carry
    ? `
What you reported last time${lastRan ? ` (${lastRan})` : ''}, so "since last time" has a meaning. Do not repeat it; build on it:
--- LAST REPORT ---
${routine.carry}
--- END LAST REPORT ---
`
    : ''
}
Rules for this run:
- Write your findings as one reply into the chat, in your usual voice. Lead with the single most important thing.
- Reads are fine on your own. Do NOT send, create, move, or change anything anywhere: if the work calls for it, describe what you would do and tell the user they can ask you in the chat.
- If you cannot do the work (nothing to read, no access), say so plainly in one or two sentences.
- End by briefly noting anything worth their attention next time, if there is anything.`

  try {
    const { finalText, errorText } = await drainSession({
      anthropic,
      sessionId: session.id,
      supabase,
      userId: routine.user_id,
      agentId: agent.id,
      agentModel: agent.model,
      threadId: thread.id,
      initialEvents: [
        { type: 'user.message', content: [{ type: 'text', text: kickoff }] },
      ],
      send: () => {},
      denyWrites: true,
      usageSource: 'schedule',
    })

    if (!finalText && errorText) throw new Error(errorText)

    const headline = firstLine(finalText) ?? 'Ran, nothing to report'
    await supabase
      .from('routine_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        headline,
      })
      .eq('id', run?.id ?? '')
    await supabase
      .from('routines')
      .update({
        consecutive_failures: 0,
        carry: finalText ? finalText.slice(0, CARRY_CHARS) : routine.carry,
      })
      .eq('id', routine.id)
    return { ok: true, runId: run?.id ?? '', headline }
  } catch (err) {
    // A failed run says so in the thread, in plain words, and names the next
    // attempt. A failed run that says nothing is how products like this lose
    // people.
    const failures = routine.consecutive_failures + 1
    const next = nextOccurrences(rule, new Date(), 1)[0] ?? null
    await supabase
      .from('routine_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
      })
      .eq('id', run?.id ?? '')
    await supabase
      .from('routines')
      .update({
        consecutive_failures: failures,
        ...(failures >= FAILING_AFTER ? { status: 'paused_system' as const } : {}),
      })
      .eq('id', routine.id)
    await supabase.from('messages').insert({
      thread_id: thread.id,
      role: 'agent',
      content:
        failures >= FAILING_AFTER
          ? `I tried to run "${routine.name}" and hit a problem, for the third time in a row, so I have paused it. Resume it from Routines when you want me to try again.`
          : `I tried to run "${routine.name}" and hit a problem. ${
              next
                ? 'I will try again at the next scheduled time.'
                : 'I will try again next time.'
            } If it keeps happening, tell me and I will look into it.`,
    })
    return { ok: false, reason: 'The run failed.' }
  }
}

// The run's one-line receipt: the first real line of the report, with the
// markdown dressing (bold markers, heading hashes, list bullets) stripped so
// it reads as a sentence in a list, not as syntax.
function firstLine(text: string): string | null {
  const line = text
    .split('\n')
    .map((l) => l.replace(/^[#>\-\s]+/, '').replace(/\*\*/g, '').trim())
    .find((l) => l.length > 0)
  if (!line) return null
  return line.length > 120 ? `${line.slice(0, 117)}...` : line
}
