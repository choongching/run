import { requireUser } from '@/lib/api-helpers'
import { toChatError } from '@/lib/chat/errors'
import { ensureEnvironment } from '@/lib/anthropic/environment'
import {
  buildAgentToolset,
  getAnthropicClient,
  MANAGED_AGENTS_BETA,
} from '@/lib/anthropic/client'
import { onboardingKickoff } from '@/lib/chat/onboarding'
import { drainSession, type Frame } from '@/lib/chat/run-turn'
import { CHAT_TOOL_DEFINITIONS } from '@/lib/tools/definitions'
import { firstName } from '@/lib/user-name'

// Start the first-run setup interview: the agent introduces itself and asks a
// few questions (via ask_user) to learn what the user wants. The kickoff is
// hidden; only the agent's reply streams. Answers come back through the answer
// route, which resumes the same session and finalizes the brief at the end.
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
    .select('id, name, status, model, claude_agent_id, onboarded')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return Response.json({ error: 'That agent is not here any more.' }, { status: 404 })
  }
  if (agent.onboarded) {
    return Response.json({ error: 'Already set up' }, { status: 409 })
  }
  if (!agent.claude_agent_id) {
    return Response.json(
      { error: 'This agent is not synced to Claude yet.' },
      { status: 400 }
    )
  }

  // Who the agent is about to meet. One extra read, on the first turn of a new
  // agent only, and a missing profile just means the greeting drops the name.
  const [{ data: thread }, { data: profile }] = await Promise.all([
    supabase
      .from('threads')
      .select('id, session_id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', userId).single(),
  ])

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

  // Fresh interview: clear any prior accumulation on this thread.
  await supabase
    .from('threads')
    .update({ setup_answers: [] })
    .eq('id', thread.id)

  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (frame: Frame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`))

      try {
        // First turn of a new agent: create the session with our tools (the
        // ask_user tool lives in CHAT_TOOL_DEFINITIONS, so it is available for
        // the interview).
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
              content: [
                {
                  type: 'text',
                  text: onboardingKickoff({
                    firstName: firstName(profile?.display_name),
                    agentName: agent.name,
                  }),
                },
              ],
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
