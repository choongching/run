import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

import { MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import {
  isAskTool,
  isAutoRunTool,
  isCreateDocumentTool,
  isProposeTool,
  stripCiteTags,
  summarizeAsk,
  summarizeDocument,
  summarizeProposal,
  summarizeWrite,
  type AskOption,
} from '@/lib/tools/definitions'
import { neededConnectors, type NeededConnector } from '@/lib/chat/onboarding'
import { toChatError, type ChatError } from '@/lib/chat/errors'
import { executeTool } from '@/lib/tools/execute'
import { recordUsage } from '@/lib/usage'
import type { Database, Json } from '@/lib/types/database'

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

type InitialEvents = Parameters<
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
export async function drainSession(
  opts: DrainOpts
): Promise<{ status: TurnStatus }> {
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
      source: 'chat',
      status: failed ? 'failed' : 'completed',
    })
  }
}

async function drainSessionInner(
  opts: DrainOpts,
  tally: TokenTally
): Promise<{ status: TurnStatus }> {
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

  // Send the triggering events. If a prior turn left tool calls unresolved on
  // the session (our pending_tools can be null while the session still waits),
  // a fresh user.message is rejected with "waiting on responses to events ...".
  // Recover by interrupting to clear that state, then resend. This never fires
  // for tool-result sends (approve/answer), which the waiting session accepts.
  const sendInitial = () =>
    anthropic.beta.sessions.events.send(sessionId, {
      events: initialEvents,
      betas: [MANAGED_AGENTS_BETA],
    })
  try {
    await sendInitial()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/waiting on responses|only .* may be sent/i.test(msg)) {
      await anthropic.beta.sessions.events.send(sessionId, {
        events: [{ type: 'user.interrupt' }],
        betas: [MANAGED_AGENTS_BETA],
      })
      await sendInitial()
    } else {
      throw err
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

      // The agent asked the user a question: persist it and show the options
      // card. The turn pauses until the answer route resumes the session.
      const askCall = pending.find((c) => isAskTool(c.name))
      if (askCall) {
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
      if (proposeCall) {
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

      // Safe by default: auto-execute ONLY known read tools. If any pending
      // call is not a known read (a write, or an unclassified tool), stop and
      // show the approval card. Nothing runs until the user approves. This is
      // the enforcement point, so a new tool can never auto-run a side effect
      // just because it was left off the write list.
      if (pending.some((c) => !isAutoRunTool(c.name))) {
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

      // Reads only: execute and feed results back so the stream resumes.
      const resultEvents: InitialEvents = []
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

  return { status }
}
