import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

import { MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import {
  isAskTool,
  isWriteTool,
  summarizeAsk,
  summarizeWrite,
  type AskOption,
} from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/execute'
import { recordUsage } from '@/lib/usage'
import type { Database, Json } from '@/lib/types/database'

export type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; label: string }
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
  | { type: 'onboarded' }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

// How a turn ended: paused for the user (write approval or a question), or ran
// to completion. The onboarding answer route uses null to know the interview
// is over and it can save the brief.
export type TurnStatus = 'approval' | 'ask' | null

export type PendingCall = {
  id: string
  name: string
  input: Record<string, unknown>
}

type InitialEvents = Parameters<
  Anthropic['beta']['sessions']['events']['send']
>[1]['events']

// Compact activity line for a tool call.
export function toolActivity(name: string): string {
  const map: Record<string, string> = {
    gmail_search: 'Searching your inbox',
    gmail_get_message: 'Reading an email',
    gmail_create_draft: 'Drafting an email',
    drive_list_files: 'Looking through your Drive',
    drive_read_file: 'Reading a file',
  }
  return map[name] ?? `Using ${name.replace(/_/g, ' ')}`
}

// Open the event stream, send the triggering events, and drain the turn:
// stream text/activity, auto-execute read tools, and pause for approval when
// the agent asks to run a write tool. Persists activity + the final reply and
// records usage. Shared by the chat message route and the approve route.
export async function drainSession(opts: {
  anthropic: Anthropic
  sessionId: string
  supabase: SupabaseClient<Database>
  userId: string
  agentId: string
  agentModel: string
  threadId: string
  initialEvents: InitialEvents
  send: (frame: Frame) => void
}): Promise<{ status: TurnStatus }> {
  const {
    anthropic,
    sessionId,
    supabase,
    userId,
    agentId,
    agentModel,
    threadId,
    initialEvents,
    send,
  } = opts

  let inputTokens = 0
  let outputTokens = 0
  const activityLabels: string[] = []
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
  await anthropic.beta.sessions.events.send(sessionId, {
    events: initialEvents,
    betas: [MANAGED_AGENTS_BETA],
  })

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
      const messageText = event.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim()
      if (messageText) agentParts.push(messageText)
    } else if (event.type === 'agent.custom_tool_use') {
      pending.push({ id: event.id, name: event.name, input: event.input })
      // ask_user is a question, not work: it gets a card, not an activity line.
      if (!isAskTool(event.name)) {
        const label = toolActivity(event.name)
        activityLabels.push(label)
        send({ type: 'activity', label })
      }
    } else if (event.type === 'span.model_request_end') {
      inputTokens += event.model_usage.input_tokens
      outputTokens += event.model_usage.output_tokens
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

      // Writes ask first: if any pending call is a write, stop and show the
      // approval card. Nothing runs until the user approves.
      if (pending.some((c) => isWriteTool(c.name))) {
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

  void recordUsage({
    userId,
    agentId,
    missionId: null,
    model: agentModel,
    inputTokens,
    outputTokens,
    eventType: 'mission_run',
  })

  for (const label of activityLabels) {
    await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'activity', content: label })
  }
  const finalText = agentParts.join('\n\n').trim()
  if (finalText) {
    await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'agent', content: finalText })
  }
  await supabase
    .from('threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  if (status) {
    // A card (approval or question) is already sent; finalize any preamble
    // text. Empty text is fine; the client skips empty done frames.
    send({ type: 'done', text: finalText })
  } else if (!finalText && sentConnect) {
    // The turn ended on a connect card with no closing text; that card is the
    // next step, so finish quietly rather than showing an error.
    send({ type: 'done', text: '' })
  } else if (!finalText) {
    send({
      type: 'error',
      message: sessionError ?? 'The agent finished without a reply. Try again.',
    })
  } else {
    send({ type: 'done', text: finalText })
  }

  return { status }
}
