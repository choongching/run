import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient } from '@/lib/anthropic/client'
import {
  drainSession,
  toolActivity,
  type Frame,
  type PendingCall,
} from '@/lib/chat/run-turn'
import { executeTool } from '@/lib/tools/execute'

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

  const { data: agent } = await supabase
    .from('agents')
    .select('id, model')
    .eq('id', agentId)
    .single()
  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
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

      try {
        const resultEvents = []
        for (const call of pending) {
          if (!approved) {
            resultEvents.push({
              type: 'user.custom_tool_result' as const,
              custom_tool_use_id: call.id,
              content: [
                {
                  type: 'text' as const,
                  text: 'The user declined this action. Do not perform it; acknowledge and ask what they would like instead.',
                },
              ],
              is_error: true,
            })
            continue
          }
          // Approved: run it, showing an activity line and handling a missing
          // connection.
          const act = toolActivity(call.name, call.input)
          send({ type: 'activity', present: act.present, past: act.past })
          const outcome = await executeTool(
            supabase,
            userId,
            call.name,
            call.input
          )
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
        const message =
          err instanceof Error ? err.message : 'Something went wrong'
        send({ type: 'error', message })
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
