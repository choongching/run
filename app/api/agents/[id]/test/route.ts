import { NextResponse } from 'next/server'
import { requireAgentEditor } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import { recordUsage } from '@/lib/usage'

// The wizard's safe trial: run a small brief against the draft agent in a
// throwaway session. No mission row, no Drive output, no timeline; the
// result comes back inline and only usage is recorded. Sessions are cheap
// and stay inspectable in the Console like mission sessions do.
export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase, userId, agent } = await requireAgentEditor(id)
  if (error) return error

  const body = await request.json().catch(() => null)
  const brief = typeof body?.brief === 'string' ? body.brief.trim() : ''
  if (!brief) {
    return NextResponse.json(
      { error: 'Give it a small task to try' },
      { status: 400 }
    )
  }
  if (!agent.claude_agent_id) {
    return NextResponse.json(
      { error: 'This agent is not synced yet. Save the first step again.' },
      { status: 400 }
    )
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_context, anthropic_environment_id')
    .not('id', 'is', null)
    .limit(1)
    .single()
  if (!settings?.anthropic_environment_id) {
    return NextResponse.json(
      { error: 'The agent runtime is not set up yet. Ask an admin.' },
      { status: 400 }
    )
  }

  const anthropic = getAnthropicClient()
  let inputTokens = 0
  let outputTokens = 0

  try {
    const session = await anthropic.beta.sessions.create({
      agent: agent.claude_agent_id,
      environment_id: settings.anthropic_environment_id,
      title: `Test: ${agent.name}`,
      betas: [MANAGED_AGENTS_BETA],
    })

    const parts: string[] = []
    if (settings.company_context) {
      parts.push(`## Tone of Voice and Brand\n\n${settings.company_context}`)
    }
    if (agent.guardrails) {
      parts.push(
        `## Rules from this agent's owner\n\nFollow these rules carefully:\n${agent.guardrails}`
      )
    }
    parts.push(
      'This is a quick test run. Reply with only the finished result as plain text, no commentary about your process. Keep it brief.'
    )
    parts.push(`## Task\n\n${brief}`)

    const stream = await anthropic.beta.sessions.events.stream(session.id, {
      betas: [MANAGED_AGENTS_BETA],
    })
    await anthropic.beta.sessions.events.send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: parts.join('\n\n') }],
        },
      ],
      betas: [MANAGED_AGENTS_BETA],
    })

    const messages: string[] = []
    let sessionError: string | null = null
    for await (const event of stream) {
      if (event.type === 'agent.message') {
        const text = event.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        if (text) messages.push(text)
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

    const result = messages.at(-1)
    if (!result) {
      throw new Error(sessionError ?? 'The test finished without a result')
    }

    void recordUsage({
      userId,
      agentId: agent.id,
      missionId: null,
      model: agent.model,
      inputTokens,
      outputTokens,
      eventType: 'mission_run',
    })

    return NextResponse.json({ result })
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
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
