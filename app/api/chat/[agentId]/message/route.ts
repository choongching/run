import { requireUser } from '@/lib/api-helpers'
import {
  buildAgentToolset,
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
} from '@/lib/anthropic/client'
import { drainSession, type Frame } from '@/lib/chat/run-turn'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'

// A chat turn: persist the user message, run it through the thread's Managed
// Agents session, and stream the reply (token deltas, tool activity, connect
// prompts, write-approval requests) as newline-delimited JSON. Synchronous;
// the platform timeout is the turn's ceiling.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const body = await request.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, status, model, claude_agent_id')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }
  if (agent.status !== 'active') {
    return Response.json({ error: 'This agent is not active' }, { status: 400 })
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

  const { data: settings } = await supabase
    .from('company_settings')
    .select('anthropic_environment_id')
    .not('id', 'is', null)
    .limit(1)
    .single()

  const environmentId = settings?.anthropic_environment_id
  if (!environmentId) {
    return Response.json(
      {
        error:
          'The agent runtime is not set up yet. Ask an admin to create it under Connections.',
      },
      { status: 400 }
    )
  }

  // Persist the user's message before streaming, so it is never lost even if
  // the agent turn fails midway.
  await supabase
    .from('messages')
    .insert({ thread_id: thread.id, role: 'user', content: text })
  await supabase
    .from('threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', thread.id)

  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`))

      try {
        // Reuse the thread's session so the agent keeps context; create it on
        // the first turn with our custom tools attached (agent_with_overrides
        // replaces the tool set, so include the base toolset too).
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
            { type: 'user.message', content: [{ type: 'text', text }] },
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
