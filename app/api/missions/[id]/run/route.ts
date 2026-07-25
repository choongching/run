import { NextResponse } from 'next/server'
import { toFile } from '@anthropic-ai/sdk'
import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import { assertAgentInSquad } from '@/lib/missions'
import { recordMissionEvent } from '@/lib/missions/events'
import { readDriveFile } from '@/lib/drive/read-file'
import { createDriveFile } from '@/lib/drive/create-file'
import { recordUsage } from '@/lib/usage'
import type { Mission } from '@/lib/types/database'

// The core of the product: run a queued mission through a Managed Agents
// Session. Synchronous for v1 — the platform timeout is the run's ceiling.
export const maxDuration = 300

const OUTPUT_INSTRUCTIONS: Record<Mission['output_type'], string> = {
  text: 'Your final message must contain only the finished deliverable as plain text, with no commentary about your process.',
  doc: 'Your final message must contain only the finished deliverable as plain text, ready to be saved as a document. No commentary about your process.',
  pdf: 'Your final message must contain only the finished deliverable as plain text, ready to be saved as a document. No commentary about your process.',
  sheet:
    'Your final message must contain only the finished deliverable as CSV: a header row, then data rows, comma-separated, with cells containing commas wrapped in double quotes. No code fences, no commentary.',
}

// Mount names must be filesystem-safe and unique within the session.
function safeMountNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    const base =
      name
        .replace(/\.[a-z0-9]+$/i, '')
        .replaceAll(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 60) || 'file'
    let candidate = base
    let i = 2
    while (used.has(candidate)) candidate = `${base}_${i++}`
    used.add(candidate)
    return candidate
  })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { id } = await params

  const { data: mission } = await supabase
    .from('missions')
    .select('*, agents(id, name, status, model, claude_agent_id)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }
  // Stopped and failed runs stay re-runnable: the brief is never lost.
  const RUNNABLE: Mission['status'][] = ['needs_attention', 'stopped', 'failed']
  if (!RUNNABLE.includes(mission.status)) {
    return NextResponse.json(
      { error: 'This mission is already running or finished' },
      { status: 409 }
    )
  }

  const agent = mission.agents as {
    id: string
    name: string
    status: string
    model: string
    claude_agent_id: string | null
  } | null

  const squadError = await assertAgentInSquad(supabase, userId, mission.agent_id)
  if (squadError) return squadError
  if (!agent || agent.status !== 'active') {
    return NextResponse.json(
      { error: 'This agent is no longer active' },
      { status: 400 }
    )
  }
  if (!agent.claude_agent_id) {
    return NextResponse.json(
      {
        error:
          'This agent is not synced to Claude yet. Ask an admin to re-save it.',
      },
      { status: 400 }
    )
  }

  const [{ data: settings }, { data: knowledge }, { data: squadRow }] =
    await Promise.all([
      supabase
        .from('company_settings')
        .select(
          'company_context, pipedream_account_id, pipedream_connected_by, anthropic_environment_id'
        )
        .not('id', 'is', null)
        .limit(1)
        .single(),
      supabase
        .from('agent_knowledge')
        .select('file_id, file_name, file_mime_type')
        .eq('agent_id', mission.agent_id)
        .order('file_name'),
      supabase
        .from('user_agents')
        .select('custom_instructions')
        .eq('user_id', userId)
        .eq('agent_id', mission.agent_id)
        .maybeSingle(),
    ])

  const environmentId = settings?.anthropic_environment_id
  if (!environmentId) {
    return NextResponse.json(
      {
        error:
          'The agent runtime is not set up yet. Ask an admin to create it under Admin > Integrations.',
      },
      { status: 400 }
    )
  }

  const driveConnected = Boolean(
    settings?.pipedream_account_id && settings?.pipedream_connected_by
  )
  const knowledgeFiles = knowledge ?? []
  if (!driveConnected && (knowledgeFiles.length > 0 || mission.output_type !== 'text')) {
    return NextResponse.json(
      {
        error:
          'Google Drive is not connected, so this mission cannot read knowledge or save Drive outputs. Ask an admin to reconnect it, or switch the mission to text output.',
      },
      { status: 400 }
    )
  }

  await supabase
    .from('missions')
    .update({ status: 'in_progress', error_message: null })
    .eq('id', id)
    .eq('user_id', userId)

  // Timeline marker: the Activity view renders events after the latest
  // 'run.started', so a re-run naturally begins a fresh timeline while older
  // attempts stay in the log.
  await recordMissionEvent(supabase, id, 'run.started', {
    agent_name: agent.name,
    web_search: mission.web_search,
    output_type: mission.output_type,
  })

  const anthropic = getAnthropicClient()
  const uploadedFileIds: string[] = []
  let sessionId: string | null = null
  // Outside the try so a failed run still records the tokens it consumed.
  let inputTokens = 0
  let outputTokens = 0

  async function cleanupUploads() {
    await Promise.all(
      uploadedFileIds.map((fileId) =>
        anthropic.beta.files.delete(fileId).catch(() => undefined)
      )
    )
  }

  try {
    // Knowledge: extract each pinned file to text and upload it for mounting.
    // Pre-extracted text (not raw bytes) because the container's read tool
    // cannot handle .docx and returns empty for some PDFs.
    const mountNames = safeMountNames(knowledgeFiles.map((f) => f.file_name))
    const resources: { type: 'file'; file_id: string; mount_path: string }[] = []
    for (const [i, file] of knowledgeFiles.entries()) {
      const text = await readDriveFile({
        fileId: file.file_id,
        mimeType: file.file_mime_type,
        userId: settings!.pipedream_connected_by!,
        accountId: settings!.pipedream_account_id!,
      })
      const uploaded = await anthropic.beta.files.upload({
        file: await toFile(Buffer.from(text, 'utf-8'), `${mountNames[i]}.txt`, {
          type: 'text/plain',
        }),
      })
      uploadedFileIds.push(uploaded.id)
      resources.push({
        type: 'file',
        file_id: uploaded.id,
        mount_path: `/workspace/knowledge/${mountNames[i]}.txt`,
      })
    }

    const session = await anthropic.beta.sessions.create({
      agent: agent.claude_agent_id,
      environment_id: environmentId,
      title: mission.title,
      resources,
      betas: [MANAGED_AGENTS_BETA],
    })
    sessionId = session.id

    // Persist the session id immediately (not only on completion) so the
    // stop and refine routes can reach the session while the run is live.
    await supabase
      .from('missions')
      .update({ anthropic_run_id: session.id })
      .eq('id', id)
      .eq('user_id', userId)

    // The API re-roots mount paths (under /mnt/session/uploads/...), so the
    // kickoff message must list the resolved paths, not the requested ones.
    const mountedPaths = session.resources
      .filter((r) => r.type === 'file')
      .map((r) => r.mount_path)

    const parts: string[] = []
    if (settings?.company_context) {
      parts.push(`## Tone of Voice and Brand\n\n${settings.company_context}`)
    }
    if (squadRow?.custom_instructions) {
      parts.push(
        `## Additional instructions from this user\n\n${squadRow.custom_instructions}`
      )
    }
    if (mountedPaths.length > 0) {
      parts.push(
        `## Knowledge files\n\nRead these mounted files before responding:\n${mountedPaths.map((p) => `- ${p}`).join('\n')}`
      )
    }
    if (!mission.web_search) {
      parts.push('Do not use web search for this task.')
    }
    parts.push(OUTPUT_INSTRUCTIONS[mission.output_type])
    parts.push(`## Task\n\n${mission.brief}`)

    // Stream-first so no event between send and subscribe is lost.
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

    const agentMessages: string[] = []
    let sessionError: string | null = null

    for await (const event of stream) {
      // Every event lands in the timeline; inserts are awaited so row order
      // matches event order, and recordMissionEvent never throws.
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

    // If the user pressed Stop, the interrupt ended the turn above. The stop
    // route owns the terminal status; this route only preserves whatever
    // partial output exists and settles usage.
    const { data: current } = await supabase
      .from('missions')
      .select('status')
      .eq('id', id)
      .single()
    if (current?.status === 'stopped') {
      const partial = agentMessages.at(-1) ?? null
      await supabase
        .from('missions')
        .update({ output_text: partial })
        .eq('id', id)
        .eq('user_id', userId)
      void recordUsage({
        userId,
        agentId: agent.id,
        missionId: id,
        model: agent.model,
        inputTokens,
        outputTokens,
        eventType: 'mission_run',
      })
      await cleanupUploads()
      return NextResponse.json({ stopped: true })
    }

    const finalText = agentMessages.at(-1) ?? ''
    if (!finalText) {
      throw new Error(
        sessionError ?? 'The agent finished without producing any output'
      )
    }

    // Drive output is best-effort: the mission never loses its result, the
    // text is always kept as a fallback.
    let outputUrl: string | null = null
    if (mission.output_type !== 'text') {
      try {
        const created = await createDriveFile({
          type: mission.output_type,
          title: mission.title,
          content: finalText,
          userId: settings!.pipedream_connected_by!,
          accountId: settings!.pipedream_account_id!,
        })
        outputUrl = created.url
      } catch {
        outputUrl = null
      }
    }

    const { data: completed, error: dbError } = await supabase
      .from('missions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_url: outputUrl,
        output_text: finalText,
        anthropic_run_id: session.id,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, agents(name)')
      .single()

    if (dbError) throw new Error(dbError.message)

    await recordMissionEvent(supabase, id, 'run.completed', {
      output_type: mission.output_type,
      output_url: outputUrl,
    })

    void recordUsage({
      userId,
      agentId: agent.id,
      missionId: id,
      model: agent.model,
      inputTokens,
      outputTokens,
      eventType: 'mission_run',
    })

    // The session keeps its own copies of mounted files; the originals in the
    // Files API are no longer needed. Session is NOT archived — it stays
    // inspectable in the Console.
    await cleanupUploads()

    return NextResponse.json({
      mission: completed,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    })
  } catch (err) {
    await cleanupUploads()
    // A failed run still consumed whatever tokens were streamed before the
    // failure; record them so usage stays honest.
    if (inputTokens > 0 || outputTokens > 0) {
      void recordUsage({
        userId,
        agentId: agent.id,
        missionId: id,
        model: agent.model,
        inputTokens,
        outputTokens,
        eventType: 'mission_run',
      })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    // A stopped run's early return never throws, so reaching here means a
    // real failure: mark it 'failed' (still re-runnable, the brief is kept)
    // instead of silently reverting to queued, and say why on the run page.
    // Do not clobber a concurrent stop.
    const { data: current } = await supabase
      .from('missions')
      .select('status')
      .eq('id', id)
      .single()
    if (current?.status !== 'stopped') {
      await supabase
        .from('missions')
        .update({
          status: 'failed',
          error_message: message,
          ...(sessionId ? { anthropic_run_id: sessionId } : {}),
        })
        .eq('id', id)
        .eq('user_id', userId)
      await recordMissionEvent(supabase, id, 'run.failed', { message })
    }

    return NextResponse.json(
      { error: `Mission run failed: ${message}` },
      { status: 500 }
    )
  }
}
