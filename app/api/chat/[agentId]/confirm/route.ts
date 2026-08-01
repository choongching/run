import { requireUser } from '@/lib/api-helpers'
import { toChatError } from '@/lib/chat/errors'
import { getAnthropicClient } from '@/lib/anthropic/client'
import {
  finalizeOnboarding,
  FIRST_TASK_KICKOFF,
  type SetupAnswer,
} from '@/lib/chat/onboarding'
import {
  drainSession,
  type Frame,
  type InitialEvents,
  type PendingCall,
} from '@/lib/chat/run-turn'
import { isProposeTool } from '@/lib/tools/definitions'

// Confirm the setup an agent proposed, then let it start.
//
// This is the work the answer route used to do silently the moment the
// interview ended: save the brief and run the first task. It now happens
// because someone chose it, with whatever edits they made to the name and the
// instructions on the way through.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim().slice(0, 60)
  const instructions = String(body?.instructions ?? '').trim()
  if (!name || !instructions) {
    return Response.json(
      { error: 'A name and instructions are required' },
      { status: 400 }
    )
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, model, onboarded, claude_agent_id, claude_version, personality')
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
  if (!thread?.session_id) {
    return Response.json({ error: 'There is nothing waiting to be confirmed.' }, { status: 409 })
  }

  const pending = (thread.pending_tools as unknown as PendingCall[] | null) ?? []
  const proposeCall = pending.find((c) => isProposeTool(c.name))
  const answers =
    (thread.setup_answers as unknown as SetupAnswer[] | null) ?? []

  // Clear the pending state first so a double tap cannot confirm twice.
  await supabase
    .from('threads')
    .update({ pending_tools: null })
    .eq('id', thread.id)

  // The edited name is the one the user just read and accepted, so it wins over
  // whatever was generated at creation.
  await supabase
    .from('agents')
    .update({ name })
    .eq('id', agentId)
    .eq('owner_id', userId)

  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`))

      try {
        // The confirmed instructions become the agent's base prompt; the setup
        // answers and personality are folded back in around them, exactly as
        // editing instructions in the config panel does.
        await finalizeOnboarding({
          anthropic,
          supabase,
          agentId: agent.id,
          claudeAgentId: agent.claude_agent_id,
          claudeVersion: agent.claude_version,
          baseSystemPrompt: instructions,
          answers,
          personality: agent.personality,
        })
        send({ type: 'onboarded' })

        // The proposal was a paused tool call, so the session is waiting on a
        // result. Answering it RESUMES the session, which is why the kickoff
        // travels inside that same result rather than as a second event: two
        // sends meant the second one arrived while the first was still
        // running, got refused, and the recovery interrupt then killed the
        // first task mid-flight. One send, one turn, one run.
        //
        // With no proposal to answer (the agent talked its way through setup
        // instead of calling the tool), the kickoff is an ordinary message.
        const kickoff: InitialEvents = proposeCall
          ? [
              {
                type: 'user.custom_tool_result',
                custom_tool_use_id: proposeCall.id,
                content: [
                  {
                    type: 'text',
                    text: `The user confirmed this setup. It is saved.\n\n${FIRST_TASK_KICKOFF}`,
                  },
                ],
              },
            ]
          : [
              {
                type: 'user.message',
                content: [{ type: 'text', text: FIRST_TASK_KICKOFF }],
              },
            ]

        await drainSession({
          anthropic,
          sessionId: thread.session_id!,
          supabase,
          userId,
          agentId: agent.id,
          agentModel: agent.model,
          threadId: thread.id,
          initialEvents: kickoff,
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
