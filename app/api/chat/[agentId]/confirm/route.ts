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
import { ensureSession } from '@/lib/chat/session'
import { ensureEnvironment } from '@/lib/anthropic/environment'
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
  if (!thread) {
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

  // Only needed when the session has to be rebuilt, but reading it here keeps
  // the failure a plain JSON error instead of one mid-stream.
  const environment = await ensureEnvironment()
  if (!environment.ok) {
    return Response.json({ error: environment.reason }, { status: 503 })
  }
  const environmentId = environment.environmentId

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
        const kickoff = (recap: string | null): InitialEvents => {
          const blocks = recap
            ? [
                { type: 'text' as const, text: recap },
                { type: 'text' as const, text: FIRST_TASK_KICKOFF },
              ]
            : [{ type: 'text' as const, text: FIRST_TASK_KICKOFF }]
          return proposeCall
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
            : [{ type: 'user.message', content: blocks }]
        }

        // Normally the session is the one that made the proposal. It can be
        // gone if the owner saved a config change while the card was on
        // screen, which also clears the pending call: rather than strand
        // someone on a card that no longer works, build a session, hand it the
        // conversation, and let the kickoff arrive as a plain message.
        const { sessionId, recapText } = await ensureSession({
          anthropic,
          supabase,
          threadId: thread.id,
          sessionId: thread.session_id,
          agentId: agent.id,
          claudeAgentId: agent.claude_agent_id!,
          environmentId,
          title: name,
        })

        await drainSession({
          anthropic,
          sessionId,
          supabase,
          userId,
          agentId: agent.id,
          agentModel: agent.model,
          threadId: thread.id,
          initialEvents: kickoff(recapText),
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
