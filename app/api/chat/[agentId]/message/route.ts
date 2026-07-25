import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import { recordUsage } from '@/lib/usage'

// A chat turn: persist the user message, run it through the thread's Managed
// Agents session, and stream the agent's reply (token deltas + tool activity)
// back as newline-delimited JSON. Synchronous; the platform timeout is the
// turn's ceiling. Live chat loop for the revamp (Phase 2).
export const maxDuration = 300

type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; label: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

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

      let inputTokens = 0
      let outputTokens = 0
      const activityLabels: string[] = []
      const agentParts: string[] = []
      let sessionError: string | null = null

      try {
        // Reuse the thread's session so the agent keeps conversation context;
        // create it on the first turn.
        let sessionId = thread.session_id
        if (!sessionId) {
          const session = await anthropic.beta.sessions.create({
            agent: agent.claude_agent_id!,
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

        // Stream first (opting into token-level previews), then send, so no
        // event between send and subscribe is lost.
        const events = await anthropic.beta.sessions.events.stream(sessionId, {
          event_deltas: ['agent.message'],
          betas: [MANAGED_AGENTS_BETA],
        })
        await anthropic.beta.sessions.events.send(sessionId, {
          events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
          betas: [MANAGED_AGENTS_BETA],
        })

        let started = false
        for await (const event of events) {
          if (event.type === 'event_start') {
            if (!started) {
              started = true
              send({ type: 'start' })
            }
            if (event.event.type === 'agent.thinking') send({ type: 'thinking' })
          } else if (event.type === 'event_delta') {
            if (
              event.delta.type === 'content_delta' &&
              event.delta.content.text
            ) {
              if (!started) {
                started = true
                send({ type: 'start' })
              }
              send({ type: 'delta', text: event.delta.content.text })
            }
          } else if (event.type === 'agent.message') {
            const messageText = event.content
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join('')
              .trim()
            if (messageText) agentParts.push(messageText)
          } else if (event.type === 'agent.tool_use') {
            const label = toolLabel(event.name)
            activityLabels.push(label)
            send({ type: 'activity', label })
          } else if (event.type === 'span.model_request_end') {
            inputTokens += event.model_usage.input_tokens
            outputTokens += event.model_usage.output_tokens
          } else if (event.type === 'session.error') {
            sessionError = event.error.message
          }

          if (event.type === 'session.status_terminated') break
          if (
            event.type === 'session.status_idle' &&
            event.stop_reason.type !== 'requires_action'
          ) {
            break
          }
        }

        const finalText = agentParts.join('\n\n').trim()
        if (!finalText) {
          throw new Error(
            sessionError ?? 'The agent finished without a reply. Try again.'
          )
        }

        // Persist activity lines first (they precede the reply), then the reply.
        for (const label of activityLabels) {
          await supabase
            .from('messages')
            .insert({ thread_id: thread.id, role: 'activity', content: label })
        }
        await supabase
          .from('messages')
          .insert({ thread_id: thread.id, role: 'agent', content: finalText })
        await supabase
          .from('threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', thread.id)

        void recordUsage({
          userId,
          agentId: agent.id,
          missionId: null,
          model: agent.model,
          inputTokens,
          outputTokens,
          eventType: 'mission_run',
        })

        send({ type: 'done', text: finalText })
      } catch (err) {
        if (inputTokens > 0 || outputTokens > 0) {
          void recordUsage({
            userId,
            agentId: agent.id,
            missionId: null,
            model: agent.model,
            inputTokens,
            outputTokens,
            eventType: 'mission_run',
          })
        }
        const message = err instanceof Error ? err.message : 'Something went wrong'
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

// Human-readable activity line for a tool call.
function toolLabel(name: string): string {
  const map: Record<string, string> = {
    bash: 'Running a command',
    str_replace: 'Editing a file',
    create_file: 'Writing a file',
    read_file: 'Reading a file',
    web_search: 'Searching the web',
  }
  return map[name] ?? `Using ${name.replace(/_/g, ' ')}`
}
