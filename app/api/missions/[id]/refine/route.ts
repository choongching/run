import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import { recordMissionEvent } from '@/lib/missions/events'
import { createDriveFile } from '@/lib/drive/create-file'
import { recordUsage } from '@/lib/usage'
import type { Mission } from '@/lib/types/database'

// Refine a finished run: post a follow-up turn to the same Managed Agents
// session (multi-turn verified live, docs/capability-matrix-2026-07-25.md)
// and stream the new turn into the same timeline. Synchronous like the run
// route; the client watches over the events feed.
export const maxDuration = 300

const OUTPUT_REMINDER: Record<Mission['output_type'], string> = {
  text: 'Reply with only the full updated deliverable as plain text.',
  doc: 'Reply with only the full updated deliverable as plain text, ready to be saved as a document.',
  pdf: 'Reply with only the full updated deliverable as plain text, ready to be saved as a document.',
  sheet:
    'Reply with only the full updated deliverable as CSV (header row, then data rows). No code fences, no commentary.',
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { id } = await params

  const body = (await request.json().catch(() => null)) as {
    note?: string
  } | null
  const note = body?.note?.trim()
  if (!note) {
    return NextResponse.json(
      { error: 'Tell the agent what you want changed' },
      { status: 400 }
    )
  }

  const { data: mission } = await supabase
    .from('missions')
    .select('*, agents(model)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }
  if (!['completed', 'stopped'].includes(mission.status)) {
    return NextResponse.json(
      { error: 'Only finished runs can take a follow-up' },
      { status: 409 }
    )
  }
  if (!mission.anthropic_run_id) {
    return NextResponse.json({ expired: true }, { status: 409 })
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('pipedream_account_id, pipedream_connected_by')
    .not('id', 'is', null)
    .limit(1)
    .single()

  const anthropic = getAnthropicClient()
  const priorStatus = mission.status
  let inputTokens = 0
  let outputTokens = 0

  await supabase
    .from('missions')
    .update({ status: 'in_progress', error_message: null })
    .eq('id', id)
    .eq('user_id', userId)
  await recordMissionEvent(supabase, id, 'refine.requested', { note })

  try {
    // Stream-first so no event between send and subscribe is lost.
    const stream = await anthropic.beta.sessions.events.stream(
      mission.anthropic_run_id,
      { betas: [MANAGED_AGENTS_BETA] }
    )
    await anthropic.beta.sessions.events.send(mission.anthropic_run_id, {
      events: [
        {
          type: 'user.message',
          content: [
            {
              type: 'text',
              text: `${note}\n\n${OUTPUT_REMINDER[mission.output_type]}`,
            },
          ],
        },
      ],
      betas: [MANAGED_AGENTS_BETA],
    })

    const agentMessages: string[] = []
    let sessionError: string | null = null

    for await (const event of stream) {
      await recordMissionEvent(supabase, id, event.type, event)
      if (event.type === 'agent.message') {
        const text = event.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        if (text) agentMessages.push(text)
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

    const finalText = agentMessages.at(-1) ?? ''
    if (!finalText) {
      throw new Error(
        sessionError ?? 'The agent finished without producing any output'
      )
    }

    // Each refine saves a fresh Drive file so earlier versions stay intact.
    let outputUrl: string | null = mission.output_url
    const driveConnected = Boolean(
      settings?.pipedream_account_id && settings?.pipedream_connected_by
    )
    if (mission.output_type !== 'text' && driveConnected) {
      try {
        const created = await createDriveFile({
          type: mission.output_type,
          title: `${mission.title} (updated)`,
          content: finalText,
          userId: settings!.pipedream_connected_by!,
          accountId: settings!.pipedream_account_id!,
        })
        outputUrl = created.url
      } catch {
        // Keep the previous file link; the updated text is always kept.
      }
    }

    const { data: completed, error: dbError } = await supabase
      .from('missions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_url: outputUrl,
        output_text: finalText,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, agents(name)')
      .single()
    if (dbError) throw new Error(dbError.message)

    await recordMissionEvent(supabase, id, 'run.completed', {
      output_type: mission.output_type,
      output_url: outputUrl,
      refined: true,
    })

    void recordUsage({
      userId,
      agentId: mission.agent_id,
      missionId: id,
      model: (mission.agents as { model?: string } | null)?.model ?? 'unknown',
      inputTokens,
      outputTokens,
      eventType: 'mission_run',
    })

    return NextResponse.json({ mission: completed })
  } catch (err) {
    if (inputTokens > 0 || outputTokens > 0) {
      void recordUsage({
        userId,
        agentId: mission.agent_id,
        missionId: id,
        model:
          (mission.agents as { model?: string } | null)?.model ?? 'unknown',
        inputTokens,
        outputTokens,
        eventType: 'mission_run',
      })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    // The previous output still stands: restore the prior status rather than
    // failing the whole mission over a follow-up.
    await supabase
      .from('missions')
      .update({ status: priorStatus })
      .eq('id', id)
      .eq('user_id', userId)
    await recordMissionEvent(supabase, id, 'refine.failed', { message })

    // A session the API no longer accepts turns for surfaces as expired so
    // the client can offer "start a new run with this change" instead.
    const status =
      err && typeof err === 'object' && 'status' in err ? err.status : null
    if (status === 404 || status === 410) {
      return NextResponse.json({ expired: true }, { status: 409 })
    }
    return NextResponse.json(
      { error: `Follow-up failed: ${message}` },
      { status: 500 }
    )
  }
}
