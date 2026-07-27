import { requireUser } from '@/lib/api-helpers'
import { ensureEnvironment } from '@/lib/anthropic/environment'
import {
  buildAgentToolset,
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
} from '@/lib/anthropic/client'
import { CONNECTED_KICKOFF } from '@/lib/chat/onboarding'
import { drainSession, type Frame } from '@/lib/chat/run-turn'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'

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
    return Response.json({ error: 'Agent not found' }, { status: 404 })
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
    return Response.json({ error: 'Thread not found' }, { status: 404 })
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
        // the missing connection). Create it defensively if somehow absent.
        let sessionId = thread.session_id
        if (!sessionId) {
          const session = await anthropic.beta.sessions.create({
            agent: {
              id: agent.claude_agent_id!,
              type: 'agent_with_overrides',
              tools: [
                ...buildAgentToolset({ web_search: true }),
                ...CHAT_TOOL_DEFINITIONS,
              ],
            },
            environment_id: environmentId,
            title: agent.name,
            betas: [MANAGED_AGENTS_BETA],
          })
          sessionId = session.id
          await supabase
            .from('threads')
            .update({ session_id: sessionId })
            .eq('id', thread.id)
        }

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
              content: [{ type: 'text', text: CONNECTED_KICKOFF }],
            },
          ],
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
