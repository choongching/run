import { requireUser } from '@/lib/api-helpers'
import { toChatError } from '@/lib/chat/errors'
import { getAnthropicClient } from '@/lib/anthropic/client'
import {
  drainSession,
  toolActivity,
  type ActivityIcon,
  type Frame,
  type PendingCall,
} from '@/lib/chat/run-turn'
import { createRoutine } from '@/lib/routines/create'
import { formatOccurrence, parseRule } from '@/lib/routines/rule'
import {
  isSetRoutineTool,
  summarizeRoutine,
  summarizeWrite,
} from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/execute'
import type { Json } from '@/lib/types/database'

// Resolve a write-approval request: the user approved or denied the pending
// tool call(s) shown in the chat. On approve we execute them; either way we
// feed the result back so the paused session resumes and the agent continues.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const body = await request.json().catch(() => null)
  const approved = body?.decision === 'approve'
  // The browser's timezone, sent when the pending call is a routine. A
  // schedule means nothing without one, and only the browser knows it.
  const tz = typeof body?.tz === 'string' ? body.tz : 'UTC'

  const { data: agent } = await supabase
    .from('agents')
    .select('id, model')
    .eq('id', agentId)
    .single()
  if (!agent) {
    return Response.json({ error: 'That agent is not here any more.' }, { status: 404 })
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('id, session_id, pending_tools')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!thread?.session_id || !thread.pending_tools) {
    return Response.json(
      { error: 'Nothing is awaiting approval' },
      { status: 409 }
    )
  }

  const sessionId = thread.session_id
  const pending = thread.pending_tools as unknown as PendingCall[]
  // Clear the pending state now so a double-tap can't run it twice.
  await supabase
    .from('threads')
    .update({ pending_tools: null })
    .eq('id', thread.id)

  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`))

      // Send an activity line and KEEP it. The route used to only send, so
      // every line it drew vanished on reload: an approved write left no trace
      // in the history, and a decline left none either. The transcript is the
      // only record of what was decided once the card is gone.
      const step = async (label: string, icon?: ActivityIcon) => {
        send({ type: 'activity', present: label, past: label, icon })
        await supabase.from('messages').insert({
          thread_id: thread.id,
          role: 'activity',
          content: label,
          payload: (icon ? { icon } : null) as unknown as Json,
        })
      }

      try {
        const resultEvents = []
        for (const call of pending) {
          // A routine confirmation, not a write. Approving CREATES the
          // routine (through the user's own client, so RLS still decides who
          // may put a routine on which agent) and hands the agent the real
          // dates to confirm with.
          if (isSetRoutineTool(call.name)) {
            if (!approved) {
              const turned = summarizeRoutine(call.input)
              await step(
                turned ? `Declined: set up "${turned.name}"` : 'Declined: set up a routine',
                'declined'
              )
              resultEvents.push({
                type: 'user.custom_tool_result' as const,
                custom_tool_use_id: call.id,
                content: [
                  {
                    type: 'text' as const,
                    text: 'The user chose not to set up this routine. That is their decision and it is final: do not create it, do not propose it again in this reply, and do not question it. Acknowledge briefly and ask what they would like instead.',
                  },
                ],
                // NOT an error. A person saying no is an outcome, and marking
                // it as an error is what invited the agent to reason its way
                // around one: seen live on 2026-08-19, it read the decline,
                // decided "this error contradicts what the user just asked me
                // to do, so I should disregard it", and proposed the routine
                // again. A model works around errors. It obeys outcomes.
                is_error: false,
              })
              continue
            }
            const draft = summarizeRoutine(call.input)
            const result = draft
              ? await createRoutine(supabase, userId, {
                  agentId,
                  name: draft.name,
                  instruction: draft.instruction,
                  rule: draft.rule,
                  tz,
                })
              : ({ ok: false, reason: 'The schedule fields were not valid.' } as const)
            if (!result.ok) {
              resultEvents.push({
                type: 'user.custom_tool_result' as const,
                custom_tool_use_id: call.id,
                content: [
                  {
                    type: 'text' as const,
                    text: `The routine could not be created: ${result.reason} Tell the user plainly and offer to try again.`,
                  },
                ],
                is_error: true,
              })
              continue
            }
            const rule = parseRule(result.routine.rule)!
            send({
              type: 'activity',
              present: `Setting up "${result.routine.name}"`,
              past: `Set up "${result.routine.name}"`,
            })
            resultEvents.push({
              type: 'user.custom_tool_result' as const,
              custom_tool_use_id: call.id,
              content: [
                {
                  type: 'text' as const,
                  text: `Created. The first three runs: ${result.firstRuns
                    .map((d) => formatOccurrence(d, rule.tz))
                    .join('; ')} (${rule.tz.replace(/_/g, ' ')} time). Confirm briefly in one or two sentences and mention it can be changed any time from Routines in the sidebar. Do not repeat the full schedule details.`,
                },
              ],
            })
            continue
          }
          if (!approved) {
            await step(
              `Declined: ${summarizeWrite(call.name, call.input).title.toLowerCase()}`,
              'declined'
            )
            resultEvents.push({
              type: 'user.custom_tool_result' as const,
              custom_tool_use_id: call.id,
              content: [
                {
                  type: 'text' as const,
                  text: 'The user chose not to do this. That is their decision and it is final: do not perform it, do not ask again in this reply, and do not question it. Acknowledge briefly and ask what they would like instead.',
                },
              ],
              // See the routine decline above: a decision is not an error.
              is_error: false,
            })
            continue
          }
          // Approved: run it, showing an activity line and handling a missing
          // connection.
          const act = toolActivity(call.name, call.input)
          await step(act.past, act.icon)
          const outcome = await executeTool({
            supabase,
            userId,
            agentId,
            name: call.name,
            input: call.input,
          })
          if (outcome.kind === 'needs_connection') {
            send({ type: 'connect', app: outcome.app })
            resultEvents.push({
              type: 'user.custom_tool_result' as const,
              custom_tool_use_id: call.id,
              content: [
                {
                  type: 'text' as const,
                  text: `The user has not connected ${outcome.app} yet. Ask them to connect it, then retry.`,
                },
              ],
              is_error: true,
            })
          } else {
            resultEvents.push({
              type: 'user.custom_tool_result' as const,
              custom_tool_use_id: call.id,
              content: [{ type: 'text' as const, text: outcome.text }],
              is_error: outcome.kind === 'error',
            })
          }
        }

        await drainSession({
          anthropic,
          sessionId,
          supabase,
          userId,
          agentId: agent.id,
          agentModel: agent.model,
          threadId: thread.id,
          initialEvents: resultEvents,
          send,
        })
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
