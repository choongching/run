import { requireUser } from '@/lib/api-helpers'
import { toChatError } from '@/lib/chat/errors'
import { ensureEnvironment } from '@/lib/anthropic/environment'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { CONNECTED_KICKOFF } from '@/lib/chat/onboarding'
import { ensureSession } from '@/lib/chat/session'
import { drainSession, type Frame } from '@/lib/chat/run-turn'

// Resume the task the agent paused on after the user connects an account it
// needed. Triggered automatically when the in-thread connect card detects a
// successful connection, so the user never has to nudge the agent to continue.
// The kickoff is hidden; only the agent's reply streams.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, model, claude_agent_id')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return Response.json({ error: 'That agent is not here any more.' }, { status: 404 })
  }
  if (!agent.claude_agent_id) {
    return Response.json(
      { error: 'This agent is not synced to Claude yet.' },
      { status: 400 }
    )
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('id, session_id')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!thread) {
    return Response.json({ error: 'This conversation could not be opened.' }, { status: 404 })
  }

  // Provisioned on demand: the runtime is a platform resource, not something
  // the user has to be told about or ask anyone to set up.
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
        // The session normally already exists (the agent ran far enough to hit
        // the missing connection). If it does not, the recap matters more here
        // than anywhere: this route tells the agent to carry on where it left
        // off, and a blank session has no "where".
        const { sessionId, recapText } = await ensureSession({
          anthropic,
          supabase,
          threadId: thread.id,
          sessionId: thread.session_id,
          agentId: agent.id,
          userId,
          claudeAgentId: agent.claude_agent_id!,
          environmentId,
          title: agent.name,
        })

        await drainSession({
          anthropic,
          sessionId,
          supabase,
          userId,
          agentId: agent.id,
          agentModel: agent.model,
          threadId: thread.id,
          initialEvents: [
            {
              type: 'user.message',
              content: recapText
                ? [
                    { type: 'text', text: recapText },
                    { type: 'text', text: CONNECTED_KICKOFF },
                  ]
                : [{ type: 'text', text: CONNECTED_KICKOFF }],
            },
          ],
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
