import {
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
  readToolCeiling,
  toolsetFor,
} from '@/lib/anthropic/client'
import { ensureEnvironment } from '@/lib/anthropic/environment'
import { drainSession } from '@/lib/chat/run-turn'
import { getRunAllowance, getSearchAllowance } from '@/lib/entitlements/assert'
import { FAILING_AFTER } from '@/lib/routines/list'
import { nextOccurrences, parseRule } from '@/lib/routines/rule'
import { createServiceClient } from '@/lib/supabase/service'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'
import { ourSearchEnabled, withSearchTool } from '@/lib/search/flag'
import { deliverPausedNotice, deliverReport } from '@/lib/telegram/deliver'
import { isNothingNew, NOTHING_NEW } from '@/lib/telegram/format'
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
    .select('id, agent_id, user_id, name, instruction, rule, status, carry, consecutive_failures, last_run_at, deliver_telegram, quiet_runs')
    .eq('id', routineId)
    .maybeSingle()
  if (!routine) return { ok: false, reason: 'That routine is not here any more.' }

  const rule = parseRule(routine.rule)
  if (!rule) return { ok: false, reason: 'That routine has a broken schedule.' }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, status, model, claude_agent_id, enabled_tools')
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

  // A routine that cannot afford what it is about to do pauses itself and says
  // so once, rather than failing silently every morning for three weeks. Two
  // limits can stop it, and the shape of stopping is the same for both.
  const pauseRoutine = async (error: string, notice: string) => {
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
      error,
    })
    await supabase.from('messages').insert({
      thread_id: thread.id,
      role: 'activity',
      content: '',
      payload: { notice } as unknown as Json,
    })
    // Always sent, whatever the run found. This is the exception to quiet-on-
    // empty: a routine that has stopped itself and told nobody is a routine
    // its owner keeps waiting on.
    await deliverPausedNotice({
      supabase,
      userId: routine.user_id,
      agentId: agent.id,
      deliverTelegram: routine.deliver_telegram,
      routineName: routine.name,
      notice,
    })
  }

  // The meter's number, enforced here exactly as the message route enforces
  // it for chat.
  const allowance = await getRunAllowance(supabase, routine.user_id)
  if (allowance.used >= allowance.limit) {
    await pauseRoutine(
      'Out of runs this month',
      `"${routine.name}" paused itself: you have used all ${allowance.limit} runs this month. It starts again when your runs refill, or resume it sooner from Routines.`
    )
    return { ok: false, reason: 'Out of runs this month; the routine paused itself.' }
  }

  // The same for searches, and only for a routine that would actually search.
  // Pausing a drafting routine because a research one used up the month's
  // searches would be a limit applied to the wrong thing. So this asks the two
  // questions that decide whether search is even on the table: is our provider
  // reaching this user at all, and does this agent have search switched on.
  //
  // Checked here as well as in the executor because nobody is watching. In chat
  // a person reads "I could not search" and decides what to do; a routine would
  // just keep firing and filing empty reports.
  const ceiling = readToolCeiling(agent.enabled_tools)
  const wouldSearch = ourSearchEnabled() && ceiling.web_search
  if (wouldSearch) {
    const searches = await getSearchAllowance(supabase, routine.user_id)
    if (searches.used >= searches.limit) {
      await pauseRoutine(
        'Out of web searches this month',
        `"${routine.name}" paused itself: you have used all ${searches.limit} web searches this month. It starts again when they refill, or connect your own search account under Connectors to stop being capped.`
      )
      return {
        ok: false,
        reason: 'Out of web searches this month; the routine paused itself.',
      }
    }
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
      // The agent's own ceiling, restated: agent_with_overrides replaces the
      // tool set, so anything not repeated here is not enforced.
      tools: [
        ...toolsetFor({ ceiling, ourSearch: ourSearchEnabled() }),
        ...withSearchTool(CHAT_TOOL_DEFINITIONS, wouldSearch),
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
  // Today's date, in the schedule's own timezone. A model has no clock and its
  // training has an horizon, so without this a news routine searches for the
  // wrong year: observed live on 2026-08-18, an agent with no carry to date it
  // searched for "AI model release new 2024". The carry used to supply this by
  // accident, which meant the very first run of any routine was the one most
  // likely to be wrong.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: rule.tz })

  const kickoff = `[SCHEDULED RUN, NOT A MESSAGE] This is a routine named "${routine.name}" firing${
    opts.trigger === 'manual' ? ' because the user pressed Run now' : ' on its schedule'
  }. Today's date is ${today}. The user is not present and cannot answer questions.

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
- End by briefly noting anything worth their attention next time, if there is anything.
- If this run turned up nothing worth their attention, still write your short reply for the record, and make the very last line exactly ${NOTHING_NEW} on its own. Use it only when there is genuinely nothing new; when in doubt, leave it off.`

  try {
    const { finalText, closingBlock, errorText } = await drainSession({
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

    // From the CLOSING block, not the whole reply. A run that searched writes
    // twice: "Let me get more details on the most relevant stories:" before it
    // goes to work, then the report. The first line of the joined text is that
    // lead-in, which is how the Routines page ended up listing runs as "Let me
    // get more details..." instead of what they found.
    const headline =
      firstLine(closingBlock) ?? firstLine(finalText) ?? 'Ran, nothing to report'
    await supabase
      .from('routine_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        headline,
      })
      .eq('id', run?.id ?? '')
    // last_run_at moves with the carry, not with the attempt. It exists to date
    // stamp the last report the next run is handed ("what you reported last
    // time (2026-08-10)"), so a failed run must not advance it: that would put
    // a fresh date on a stale report. next_run_at is claimed separately by the
    // tick, which is what stops a run happening twice.

    // Quiet on empty, decided 2026-08-20. The agent marks an empty run with a
    // sentinel on its own last line; the check reads the CLOSING block for the
    // same reason the headline does, because a run that used tools writes more
    // than once and only the last block is the report.
    //
    // The miss direction is deliberate. A model that forgets the sentinel
    // sends one message that was not needed, which is mildly annoying and
    // self-correcting. The inverse design, requiring a marker to send, would
    // silently swallow real reports, and nobody would ever know.
    const foundNothing = isNothingNew(closingBlock ?? finalText)

    // Awaited, never fire-and-forget. The usage-row bug fixed on 2026-08-19
    // was exactly a serverless function ending before its background work
    // finished, and a dropped notification is the same class of silence.
    const delivered = foundNothing
      ? 'off'
      : await deliverReport({
          supabase,
          userId: routine.user_id,
          agentId: agent.id,
          deliverTelegram: routine.deliver_telegram,
          headline,
          report: finalText,
          quietRuns: routine.quiet_runs,
        })

    await supabase
      .from('routines')
      .update({
        consecutive_failures: 0,
        carry: finalText ? finalText.slice(0, CARRY_CHARS) : routine.carry,
        last_run_at: new Date().toISOString(),
        // The counter tracks quiet runs SINCE THE LAST DELIVERED REPORT, so it
        // resets on a send and not merely on a run that had something to say.
        // A person with delivery off never sees the tally, and when they turn
        // it on the first report should not open by counting weeks they were
        // never waiting through.
        quiet_runs: delivered === 'sent' ? 0 : foundNothing ? routine.quiet_runs + 1 : routine.quiet_runs,
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
