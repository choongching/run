import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

import { MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import {
  isAskTool,
  isAutoRunTool,
  isCreateDocumentTool,
  isProposeTool,
  isSetRoutineTool,
  stripCiteTags,
  summarizeAsk,
  summarizeDocument,
  summarizeProposal,
  summarizeRoutine,
  summarizeWrite,
  type AskOption,
  type RoutineDraft,
} from '@/lib/tools/definitions'
import { neededConnectors, type NeededConnector } from '@/lib/chat/onboarding'
import { toChatError, type ChatError } from '@/lib/chat/errors'
import { executeTool } from '@/lib/tools/execute'
import { recordUsage } from '@/lib/usage'
import type { Database, Json, UsageSource } from '@/lib/types/database'

export type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; present: string; past: string }
  | { type: 'artifact'; title: string; format: 'markdown'; content: string }
  | { type: 'connect'; app: string }
  | {
      type: 'approval'
      calls: { id: string; title: string; detail: string }[]
    }
  | {
      type: 'ask'
      id: string
      question: string
      help?: string
      options: AskOption[]
      allowOther: boolean
      step?: number
      total?: number
    }
  | {
      type: 'review'
      id: string
      name: string
      instructions: string
      connectors: NeededConnector[]
    }
  // A proposed routine awaiting the user's confirmation. Carries the draft
  // only: the card computes the run dates itself in the browser's timezone,
  // because the server does not know it and wrong dates would defeat the
  // card's whole point.
  | ({ type: 'routine'; id: string } & RoutineDraft)
  | { type: 'onboarded' }
  | { type: 'done'; text: string }
  | ({ type: 'error' } & ChatError)

// How a turn ended: paused for the user (write approval or a question), or ran
// to completion. The onboarding answer route uses null to know the interview
// is over and it can save the brief.
export type TurnStatus = 'approval' | 'ask' | 'review' | null

export type PendingCall = {
  id: string
  name: string
  input: Record<string, unknown>
}

export type InitialEvents = Parameters<
  Anthropic['beta']['sessions']['events']['send']
>[1]['events']

// Turn a Gmail search query into a short human phrase (e.g. " from the last 2
// days", " from alex@work.com", ' for "invoice"'). Picks the single most
// salient hint so the line stays short; empty when nothing stands out. Reads
// the query's intent rather than echoing raw Gmail operators.
function gmailSearchSuffix(query: string): string {
  const q = query.trim()
  if (!q) return ''
  const from = q.match(/from:(\S+)/i)?.[1]?.replace(/["'<>]/g, '')
  if (from) return ` from ${from}`
  const time = q.match(/newer_than:(\d+)([dhwmy])/i)
  if (time) {
    const n = Number(time[1])
    const unit = { d: 'day', h: 'hour', w: 'week', m: 'month', y: 'year' }[
      time[2].toLowerCase()
    ]
    if (unit) return ` from the last ${n} ${unit}${n === 1 ? '' : 's'}`
  }
  if (/is:unread/i.test(q)) return ' for unread messages'
  // Free-text terms with the field operators stripped out.
  const terms = q.replace(/\b\w+:("[^"]*"|\S+)/g, '').trim()
  if (terms) return ` for "${terms}"`
  return ''
}

// A compact, input-aware activity line for a tool call, as a tense pair: the
// present form shows while the step runs, the past form once it settles to a
// checkmark. Input makes each line name the specific thing it did; falls back to
// a plain label when the input has nothing human-meaningful (an opaque id).
export type ToolActivity = { present: string; past: string }

export function toolActivity(
  name: string,
  input: Record<string, unknown> = {}
): ToolActivity {
  switch (name) {
    case 'gmail_search': {
      const s = gmailSearchSuffix(String(input.query ?? ''))
      return { present: `Searching your inbox${s}`, past: `Searched your inbox${s}` }
    }
    case 'gmail_get_message':
      return { present: 'Reading an email', past: 'Read an email' }
    case 'gmail_create_draft': {
      const to = String(input.to ?? '').trim()
      return to
        ? { present: `Drafting a reply to ${to}`, past: `Drafted a reply to ${to}` }
        : { present: 'Drafting an email', past: 'Drafted an email' }
    }
    case 'drive_list_files': {
      const q = String(input.query ?? '').trim()
      return q
        ? { present: `Searching your Drive for "${q}"`, past: `Searched your Drive for "${q}"` }
        : { present: 'Looking through your Drive', past: 'Looked through your Drive' }
    }
    case 'drive_read_file':
      return { present: 'Reading a file', past: 'Read a file' }
    case 'set_routine': {
      const n = String(input.name ?? '').trim()
      return n
        ? { present: `Drawing up "${n}"`, past: `Drew up "${n}"` }
        : { present: 'Drawing up a routine', past: 'Drew up a routine' }
    }
    case 'create_document': {
      const t = String(input.title ?? '').trim()
      return t
        ? { present: `Writing "${t}"`, past: `Wrote "${t}"` }
        : { present: 'Writing a document', past: 'Wrote a document' }
    }
    default: {
      const label = name.replace(/_/g, ' ')
      return { present: `Using ${label}`, past: `Used ${label}` }
    }
  }
}

// The platform's built-in tools arrive as agent.tool_use events. Web search
// and page reads become steps a person can follow, with the real query or
// site in the line. The sandbox's internal tools (bash, file ops) return
// null on purpose: "Ran ls" would confuse more than it informs.
export function builtinActivity(
  name: string,
  input: Record<string, unknown> = {}
): ToolActivity | null {
  if (name === 'web_search') {
    const q = String(input.query ?? '').trim()
    return q
      ? { present: `Searching the web for "${q}"`, past: `Searched the web for "${q}"` }
      : { present: 'Searching the web', past: 'Searched the web' }
  }
  if (name === 'web_fetch') {
    let host = ''
    try {
      host = new URL(String(input.url ?? '')).hostname.replace(/^www\./, '')
    } catch {
      // Not a parseable URL; the plain fallback below covers it.
    }
    return host
      ? { present: `Reading ${host}`, past: `Read ${host}` }
      : { present: 'Reading a page', past: 'Read a page' }
  }
  return null
}

// Open the event stream, send the triggering events, and drain the turn:
// stream text/activity, auto-execute read tools, and pause for approval when
// the agent asks to run a write tool. Persists activity + the final reply and
// records usage. Shared by the chat message route and the approve route.
type DrainOpts = {
  anthropic: Anthropic
  sessionId: string
  supabase: SupabaseClient<Database>
  userId: string
  agentId: string
  agentModel: string
  threadId: string
  initialEvents: InitialEvents
  send: (frame: Frame) => void
  // What to show on the review card if the agent ends setup without proposing
  // anything, so a missed tool call degrades to the values we already hold
  // rather than stalling the flow.
  proposalFallback?: { name: string; instructions: string }
  // What started this turn, for the usage ledger. Defaults to 'chat'; the
  // routines executor passes 'schedule'.
  usageSource?: UsageSource
  // A scheduled run has nobody present to press a button, so under this flag
  // nothing ever pauses: questions are answered with "use your judgment",
  // and anything gated (writes, unclassified tools) is declined in words and
  // the agent told to describe it instead. pending_tools is never written,
  // which is what keeps a routine from colliding with the open chat.
  denyWrites?: boolean
}

// Tokens are tallied into a caller-owned object rather than local variables so
// that a turn which throws halfway still reports what it spent. Locals would
// be lost with the stack frame, and the spend would vanish from the ledger.
type TokenTally = {
  inputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  outputTokens: number
}

// A turn always writes a usage row, whether it finished or fell over: the
// tokens were spent either way, and a meter that silently misses every failure
// drifts further from the truth with each one. A failed row is recorded but
// not counted against the person's runs.
// The return carries the closing text and any session error alongside the
// status, because a headless caller (the routines executor) has no stream to
// watch: the error frame is invisible to it, so failure has to come back as
// a value.
export type DrainResult = {
  status: TurnStatus
  finalText: string
  errorText: string | null
}

export async function drainSession(opts: DrainOpts): Promise<DrainResult> {
  const tally: TokenTally = {
    inputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 0,
  }
  let failed = false
  try {
    return await drainSessionInner(opts, tally)
  } catch (err) {
    failed = true
    throw err
  } finally {
    void recordUsage({
      userId: opts.userId,
      agentId: opts.agentId,
      threadId: opts.threadId,
      model: opts.agentModel,
      ...tally,
      eventType: 'mission_run',
      source: opts.usageSource ?? 'chat',
      status: failed ? 'failed' : 'completed',
    })
  }
}

async function drainSessionInner(
  opts: DrainOpts,
  tally: TokenTally
): Promise<DrainResult> {
  // agentId and agentModel are the wrapper's business now: they describe the
  // usage row, not the drain.
  const {
    anthropic,
    sessionId,
    supabase,
    userId,
    threadId,
    initialEvents,
    send,
    proposalFallback = { name: '', instructions: '' },
    denyWrites = false,
  } = opts

  const activityLabels: string[] = []
  const artifacts: { title: string; content: string }[] = []
  const agentParts: string[] = []
  let sessionError: string | null = null
  let started = false
  let status: TurnStatus = null
  let sentConnect = false
  let pending: PendingCall[] = []

  const stream = await anthropic.beta.sessions.events.stream(sessionId, {
    event_deltas: ['agent.message'],
    betas: [MANAGED_AGENTS_BETA],
  })

  // Send the triggering events.
  //
  // A session refuses a fresh user.message while it still owes a response,
  // with "waiting on responses to events ...". There are two very different
  // reasons for that, and treating them the same is what used to strand
  // people:
  //
  //   1. The session is mid-flight. It is genuinely working, and in a second
  //      or two it will be idle and accept the message. Waiting costs nothing
  //      and keeps the work.
  //   2. The session is stranded. A previous turn left a tool call
  //      unanswered (our pending_tools can be null while the session still
  //      waits), and no amount of waiting will clear it.
  //
  // So: wait for idle first, and only interrupt if that does not resolve it.
  // Interrupting a working session throws away the turn it was in the middle
  // of, which is exactly how a first task became "I looked into that, but I
  // don't have anything to add".
  const sendInitial = () =>
    anthropic.beta.sessions.events.send(sessionId, {
      events: initialEvents,
      betas: [MANAGED_AGENTS_BETA],
    })
  const isBusyError = (err: unknown) =>
    /waiting on responses|only .* may be sent/i.test(
      err instanceof Error ? err.message : String(err)
    )

  try {
    await sendInitial()
  } catch (err) {
    if (!isBusyError(err)) throw err

    // Give a mid-flight turn room to land. Twelve seconds is longer than any
    // turn that is about to finish and shorter than a person's patience.
    let settled = false
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      try {
        const session = await anthropic.beta.sessions.retrieve(sessionId, {
          betas: [MANAGED_AGENTS_BETA],
        })
        if (session.status !== 'running') break
      } catch {
        // The status read is a courtesy; if it fails, fall through to the
        // resend and let that be the answer.
        break
      }
    }
    try {
      await sendInitial()
      settled = true
    } catch (retryErr) {
      if (!isBusyError(retryErr)) throw retryErr
    }

    // Still refused after it went quiet: the session is stranded on a tool
    // call nobody will answer. Now interrupting is the repair, not the
    // damage.
    if (!settled) {
      await anthropic.beta.sessions.events.send(sessionId, {
        events: [{ type: 'user.interrupt' }],
        betas: [MANAGED_AGENTS_BETA],
      })
      await sendInitial()
    }
  }

  for await (const event of stream) {
    if (event.type === 'event_start') {
      if (!started) {
        started = true
        send({ type: 'start' })
      }
      if (event.event.type === 'agent.thinking') send({ type: 'thinking' })
    } else if (event.type === 'event_delta') {
      if (event.delta.type === 'content_delta' && event.delta.content.text) {
        if (!started) {
          started = true
          send({ type: 'start' })
        }
        send({ type: 'delta', text: event.delta.content.text })
      }
    } else if (event.type === 'agent.message') {
      const messageText = stripCiteTags(
        event.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join(''),
      ).trim()
      if (messageText) agentParts.push(messageText)
    } else if (event.type === 'agent.tool_use') {
      // Built-in tools (web search, page reads) run on the platform and never
      // pause the session; they only become visible steps.
      const act = builtinActivity(event.name, event.input ?? {})
      if (act) {
        activityLabels.push(act.past)
        send({ type: 'activity', present: act.present, past: act.past })
      }
    } else if (event.type === 'agent.custom_tool_use') {
      pending.push({ id: event.id, name: event.name, input: event.input })
      // ask_user and propose_setup are the agent talking to the person, not
      // work it did: they get a card, not an activity line.
      if (!isAskTool(event.name) && !isProposeTool(event.name)) {
        const act = toolActivity(event.name, event.input)
        // Persist the past form: a stored activity is always a completed step.
        activityLabels.push(act.past)
        send({ type: 'activity', present: act.present, past: act.past })
      }
    } else if (event.type === 'span.model_request_end') {
      // A session caches its prompt, so input_tokens alone is the small
      // uncached remainder: on a real turn nearly the whole prompt arrives as
      // cache reads instead. Count all three or the row understates input by
      // orders of magnitude.
      tally.inputTokens += event.model_usage.input_tokens
      tally.cacheCreationInputTokens +=
        event.model_usage.cache_creation_input_tokens
      tally.cacheReadInputTokens += event.model_usage.cache_read_input_tokens
      tally.outputTokens += event.model_usage.output_tokens
    } else if (event.type === 'session.error') {
      sessionError = event.error.message
    }

    if (event.type === 'session.status_terminated') break
    if (event.type === 'session.status_idle') {
      if (event.stop_reason.type !== 'requires_action') break

      // Under denyWrites the three pause branches below are skipped: their
      // calls fall through to the gate, which answers them in words instead
      // of waiting for a person who is not there.
      // The agent asked the user a question: persist it and show the options
      // card. The turn pauses until the answer route resumes the session.
      const askCall = pending.find((c) => isAskTool(c.name))
      if (askCall && !denyWrites) {
        await supabase
          .from('threads')
          .update({ pending_tools: pending as unknown as Json })
          .eq('id', threadId)
        send({ type: 'ask', id: askCall.id, ...summarizeAsk(askCall.input) })
        status = 'ask'
        break
      }

      // The agent has finished the interview and is proposing what it should
      // become. Same pause as a question: persist and wait for the person to
      // confirm, edit, or tell it what to change.
      const proposeCall = pending.find((c) => isProposeTool(c.name))
      if (proposeCall && !denyWrites) {
        await supabase
          .from('threads')
          .update({ pending_tools: pending as unknown as Json })
          .eq('id', threadId)
        const proposal = summarizeProposal(proposeCall.input, {
          name: proposalFallback.name,
          instructions: proposalFallback.instructions,
        })
        send({
          type: 'review',
          id: proposeCall.id,
          ...proposal,
          connectors: neededConnectors([], proposal.instructions),
        })
        status = 'review'
        break
      }

      // The agent proposed a routine. Pause like a write: persist the call
      // and show the card. A schedule spends runs while nobody is watching,
      // so it is confirmed from a card with real dates, never auto-created.
      // An unusable draft bounces straight back to the model instead of
      // rendering a broken card.
      const routineCall = pending.find((c) => isSetRoutineTool(c.name))
      if (routineCall && !denyWrites) {
        const draft = summarizeRoutine(routineCall.input)
        if (!draft) {
          pending = []
          await anthropic.beta.sessions.events.send(sessionId, {
            events: [
              {
                type: 'user.custom_tool_result',
                custom_tool_use_id: routineCall.id,
                content: [
                  {
                    type: 'text',
                    text: 'Those schedule fields were not valid (check freq, interval, hour, and byday). Call set_routine again with corrected values.',
                  },
                ],
                is_error: true,
              },
            ],
            betas: [MANAGED_AGENTS_BETA],
          })
          continue
        }
        await supabase
          .from('threads')
          .update({ pending_tools: pending as unknown as Json })
          .eq('id', threadId)
        send({ type: 'routine', id: routineCall.id, ...draft })
        status = 'approval'
        break
      }

      // Safe by default: auto-execute ONLY known read tools. If any pending
      // call is not a known read (a write, or an unclassified tool), stop and
      // show the approval card. Nothing runs until the user approves. This is
      // the enforcement point, so a new tool can never auto-run a side effect
      // just because it was left off the write list.
      const deniedResults: InitialEvents = []
      if (pending.some((c) => !isAutoRunTool(c.name))) {
        if (!denyWrites) {
          await supabase
            .from('threads')
            .update({ pending_tools: pending as unknown as Json })
            .eq('id', threadId)
          send({
            type: 'approval',
            calls: pending.map((c) => ({
              id: c.id,
              ...summarizeWrite(c.name, c.input),
            })),
          })
          status = 'approval'
          break
        }
        // A scheduled run. The gate holds exactly as it would in chat, but
        // with nobody present the answer is words, not a card: reads carry
        // on below, and everything else is declined with instructions to
        // describe the wish instead. pending_tools stays untouched.
        for (const call of pending) {
          if (isAutoRunTool(call.name)) continue
          deniedResults.push({
            type: 'user.custom_tool_result',
            custom_tool_use_id: call.id,
            content: [
              {
                type: 'text',
                text: 'This is a scheduled run and the user is not present, so this is not available. If you were asking a question, use your best judgment and continue. If you wanted to change or send something, do not: describe what you would have done in your reply and tell the user they can ask you to do it in the chat.',
              },
            ],
          })
        }
        pending = pending.filter((c) => isAutoRunTool(c.name))
      }

      // Reads only: execute and feed results back so the stream resumes.
      const resultEvents: InitialEvents = [...deniedResults]
      for (const call of pending) {
        // create_document has no external side effect: build the artifact, show
        // it in the thread, and confirm to the agent without pasting it back.
        if (isCreateDocumentTool(call.name)) {
          const doc = summarizeDocument(call.input)
          artifacts.push(doc)
          send({
            type: 'artifact',
            title: doc.title,
            format: 'markdown',
            content: doc.content,
          })
          resultEvents.push({
            type: 'user.custom_tool_result',
            custom_tool_use_id: call.id,
            content: [
              {
                type: 'text',
                text: `The document "${doc.title}" was created and is shown to the user with a download button. Do not paste its full contents again; just tell them briefly that it is ready.`,
              },
            ],
          })
          continue
        }
        const outcome = await executeTool(supabase, userId, call.name, call.input)
        if (outcome.kind === 'needs_connection') {
          send({ type: 'connect', app: outcome.app })
          sentConnect = true
          resultEvents.push({
            type: 'user.custom_tool_result',
            custom_tool_use_id: call.id,
            content: [
              {
                type: 'text',
                text: `The user has not connected ${outcome.app} yet. Ask them to connect it using the button shown, then they can retry.`,
              },
            ],
            is_error: true,
          })
        } else {
          resultEvents.push({
            type: 'user.custom_tool_result',
            custom_tool_use_id: call.id,
            content: [{ type: 'text', text: outcome.text }],
            is_error: outcome.kind === 'error',
          })
        }
      }
      pending = []
      // Nothing to feed back (a requires_action we can't fulfil, e.g. the agent
      // gave up after a missing connection): stop draining rather than send an
      // empty events array, which the API rejects.
      if (resultEvents.length === 0) break
      await anthropic.beta.sessions.events.send(sessionId, {
        events: resultEvents,
        betas: [MANAGED_AGENTS_BETA],
      })
    }
  }

  for (const label of activityLabels) {
    await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'activity', content: label })
  }
  for (const doc of artifacts) {
    await supabase.from('messages').insert({
      thread_id: threadId,
      role: 'agent',
      content: '',
      payload: {
        artifact: { title: doc.title, format: 'markdown', content: doc.content },
      } as unknown as Json,
    })
  }
  const finalText = agentParts.join('\n\n').trim()

  // The agent did its work (a search, a read) but wrote no closing message, and
  // nothing errored: stand in a short friendly note so the turn reads as
  // finished, not failed. Skipped when a connect card or an artifact already
  // speaks for the result.
  const noReplyText =
    "I looked into that, but I don't have anything to add right now. Ask me something more specific and I'll dig in."
  const benignNoReply =
    !finalText &&
    !status &&
    !sentConnect &&
    artifacts.length === 0 &&
    !sessionError

  const closingText = finalText || (benignNoReply ? noReplyText : '')
  if (closingText) {
    await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'agent', content: closingText })
  }
  await supabase
    .from('threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  const result: DrainResult = { status, finalText, errorText: sessionError }

  if (status) {
    // A card (approval or question) is already sent; finalize any preamble
    // text. Empty text is fine; the client skips empty done frames.
    send({ type: 'done', text: finalText })
  } else if (!finalText && (sentConnect || artifacts.length > 0)) {
    // A connect card or an artifact already conveys the result; finish quietly
    // rather than showing an error or a redundant note.
    send({ type: 'done', text: '' })
  } else if (benignNoReply) {
    // The agent did its work but wrote no closing line. A warm note beats a red
    // error: the turn succeeded, there was just nothing to say back.
    send({ type: 'done', text: noReplyText })
  } else if (!finalText) {
    // A genuine failure with no text: surface the underlying session error.
    // A session error is the model's own failure report, not a sentence we
    // wrote, so it goes through the same translation as an exception.
    send({ type: 'error', ...toChatError(sessionError ?? new Error('no reply')) })
  } else {
    send({ type: 'done', text: finalText })
  }

  return result
}
