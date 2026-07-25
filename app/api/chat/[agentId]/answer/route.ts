import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient } from '@/lib/anthropic/client'
import {
  finalizeOnboarding,
  FIRST_TASK_KICKOFF,
  type SetupAnswer,
} from '@/lib/chat/onboarding'
import { drainSession, type Frame, type PendingCall } from '@/lib/chat/run-turn'
import { isAskTool, summarizeAsk } from '@/lib/tools/definitions'
import type { Json } from '@/lib/types/database'

// Answer an ask_user question: record the choice, resume the paused session,
// and stream the agent's next question or reply. When the answer ends a
// first-run setup interview, save the brief into the agent's instructions and
// auto-run its first task.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const body = await request.json().catch(() => null)
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : ''
  if (!answer) {
    return Response.json({ error: 'An answer is required' }, { status: 400 })
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, model, onboarded, system_prompt, claude_agent_id, claude_version')
    .eq('id', agentId)
    .single()
  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
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
    return Response.json({ error: 'Nothing is awaiting an answer' }, { status: 409 })
  }

  const sessionId = thread.session_id
  const question = summarizeAsk(askCall.input).question

  // Record the answer and show it in the thread, then clear the pending state
  // so a double-tap can't resume twice.
  const answers: SetupAnswer[] = [
    ...((thread.setup_answers as unknown as SetupAnswer[] | null) ?? []),
    { q: question, a: answer },
  ]
  await supabase
    .from('threads')
    .update({ setup_answers: answers as unknown as Json, pending_tools: null })
    .eq('id', thread.id)
  await supabase
    .from('messages')
    .insert({ thread_id: thread.id, role: 'user', content: answer })

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
          initialEvents: [
            {
              type: 'user.custom_tool_result',
              custom_tool_use_id: askCall.id,
              content: [{ type: 'text', text: answer }],
            },
          ],
          send,
        })

        // The agent asked another question (or a write approval): stay paused.
        if (status) return

        // The interview is over. If this agent was still being set up, save the
        // brief, then run its first task in the same stream.
        if (!agent.onboarded) {
          await finalizeOnboarding({
            anthropic,
            supabase,
            agentId: agent.id,
            claudeAgentId: agent.claude_agent_id,
            claudeVersion: agent.claude_version,
            baseSystemPrompt: agent.system_prompt,
            answers,
          })
          send({ type: 'onboarded' })

          await drainSession({
            anthropic,
            sessionId,
            supabase,
            userId,
            agentId: agent.id,
            agentModel: agent.model,
            threadId: thread.id,
            initialEvents: [
              { type: 'user.message', content: [{ type: 'text', text: FIRST_TASK_KICKOFF }] },
            ],
            send,
          })
        }
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
