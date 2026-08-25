import { requireUser } from '@/lib/api-helpers'
import { toChatError } from '@/lib/chat/errors'
import { getAnthropicClient } from '@/lib/anthropic/client'
import {
  neededConnectors,
  stripBrief,
  type SetupAnswer,
} from '@/lib/chat/onboarding'
import { drainSession, type Frame, type PendingCall } from '@/lib/chat/run-turn'
import { isAskTool, summarizeAsk } from '@/lib/tools/definitions'
import type { Json } from '@/lib/types/database'

// Answer an ask_user round: record the choices, resume the paused session, and
// stream the agent's next question or reply. When the answers end a first-run
// setup interview, save the brief into the agent's instructions and auto-run
// its first task.
//
// A round arrives whole. The card holds every step client-side and posts once,
// so this runs one resume per ROUND rather than one per question, which is
// what makes going back and changing an answer free right up until Save.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const body = await request.json().catch(() => null)
  // `answers` is a round, in the order the questions were asked. `answer` is
  // the single-question shape from before rounds existed, still accepted so a
  // card drawn by the previous deploy can still be answered.
  const given: string[] = Array.isArray(body?.answers)
    ? body.answers.map((a: unknown) => (typeof a === 'string' ? a.trim() : ''))
    : typeof body?.answer === 'string'
      ? [body.answer.trim()]
      : []
  if (given.length === 0 || given.some((a) => !a)) {
    return Response.json({ error: 'An answer is required' }, { status: 400 })
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, model, onboarded, system_prompt, claude_agent_id, claude_version, personality')
    .eq('id', agentId)
    .single()
  if (!agent) {
    return Response.json({ error: 'That agent is not here any more.' }, { status: 404 })
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('id, session_id, pending_tools, setup_answers')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .maybeSingle()

  const pending = (thread?.pending_tools as unknown as PendingCall[] | null) ?? []
  const askCall = pending.find((c) => isAskTool(c.name))
  if (!thread?.session_id || !askCall) {
    return Response.json({ error: 'That question has already been answered.' }, { status: 409 })
  }

  const sessionId = thread.session_id
  const asked = summarizeAsk(askCall.input).questions

  // Pair each answer with the question it belongs to. An answer with no
  // question behind it (a malformed card, a stale post) is dropped rather
  // than recorded against nothing.
  const round: SetupAnswer[] = asked
    .map((q, i) => ({ q: q.question, a: given[i] ?? '' }))
    .filter((entry) => entry.a)
  if (round.length === 0) {
    return Response.json({ error: 'An answer is required' }, { status: 400 })
  }

  // Record the round and show it in the thread, then clear the pending state
  // so a double-tap can't resume twice.
  const answers: SetupAnswer[] = [
    ...((thread.setup_answers as unknown as SetupAnswer[] | null) ?? []),
    ...round,
  ]
  await supabase
    .from('threads')
    .update({ setup_answers: answers as unknown as Json, pending_tools: null })
    .eq('id', thread.id)
  // One message holds the whole round. `content` is what the model and any
  // later reader see; `payload.interview` is the same answers structured, so
  // the thread can draw them as the answered card instead of a wall of text.
  await supabase.from('messages').insert({
    thread_id: thread.id,
    role: 'user',
    content: round.map((entry) => `${entry.q}\n${entry.a}`).join('\n\n'),
    payload: { interview: round } as unknown as Json,
  })

  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`))

      try {
        const { status } = await drainSession({
          anthropic,
          sessionId,
          supabase,
          userId,
          agentId: agent.id,
          agentModel: agent.model,
          threadId: thread.id,
          proposalFallback: {
            name: agent.name,
            instructions: stripBrief(agent.system_prompt ?? ''),
          },
          initialEvents: [
            {
              type: 'user.custom_tool_result',
              custom_tool_use_id: askCall.id,
              content: [
                {
                  type: 'text',
                  text: round
                    .map((entry) => `${entry.q}\n${entry.a}`)
                    .join('\n\n'),
                },
              ],
            },
          ],
          send,
        })

        // The agent asked another question, proposed its setup, or hit a write
        // approval: stay paused.
        if (status) return

        // The interview ended without a proposal, which means the agent talked
        // instead of calling propose_setup. Draw the card from what we already
        // hold so a missed tool call cannot strand someone mid-setup with no
        // way forward.
        if (!agent.onboarded) {
          const instructions = stripBrief(agent.system_prompt ?? '')
          send({
            type: 'review',
            id: '',
            name: agent.name,
            instructions,
            connectors: neededConnectors(answers, instructions),
          })
        }
      } catch (err) {
        send({ type: 'error', ...toChatError(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
