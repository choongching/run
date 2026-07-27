import { requireUser } from '@/lib/api-helpers'
import { recomposeAgentPrompt } from '@/lib/agents/recompose'
import { humanSize, kindOf, MAX_FILE_BYTES } from '@/lib/files/accepted'
import { extractFile } from '@/lib/files/extract'
import {
  attachRefusal,
  MAX_LIBRARY_SOURCES,
  trimToSourceCap,
} from '@/lib/knowledge/limits'
import { scanForSecrets, sensitiveWarning } from '@/lib/knowledge/sensitive'
import {
  agentKnowledgeLoad,
  checksumOf,
  libraryIsFull,
  NOT_AGENT_OWNER,
  ownsAgent,
} from '@/lib/knowledge/store'
import type { Json } from '@/lib/types/database'

// Upload a file into the agent's knowledge. A route handler rather than a
// server action because actions cap request bodies at 1 MB, and these are real
// documents.
//
// The response shape mirrors the chat attach route: { ok: false, reason } for
// anything the user needs to fix, so the panel can show the actual problem
// ("this looks like a scanned PDF") instead of a generic failure.
export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const confirmed = form?.get('confirmed') === 'true'
  if (!(file instanceof File)) {
    return Response.json({ ok: false, reason: 'No file received.' }, { status: 400 })
  }

  // Documents only. An image has no always-on text to keep, so accepting one
  // here would store something the agent could never actually carry.
  const kind = kindOf(file.name, file.type)
  if (kind !== 'document') {
    return Response.json({
      ok: false,
      reason: 'Knowledge takes PDF, Word, text, Markdown, or CSV files.',
    })
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({
      ok: false,
      reason: `That file is ${humanSize(file.size)}. The limit is 15 MB.`,
    })
  }

  // Checked before the upload is read and stored, so a non-owner is told why
  // instead of leaving an orphaned source behind.
  if (!(await ownsAgent(supabase, agentId, userId))) {
    return Response.json({ ok: false, reason: NOT_AGENT_OWNER })
  }

  if (await libraryIsFull(supabase, userId)) {
    return Response.json({
      ok: false,
      reason: `Your library is full at ${MAX_LIBRARY_SOURCES} sources. Delete one to add another.`,
    })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extracted = await extractFile(buffer, file.name, file.type)
  if (!extracted.ok) {
    return Response.json({ ok: false, reason: extracted.reason })
  }

  // The chat cap is far larger than a source may be, since chat text lives for
  // one turn and this lives in every turn.
  const { text, chars, truncated } = trimToSourceCap(extracted.text)

  const findings = scanForSecrets(text)
  if (findings.length > 0 && !confirmed) {
    return Response.json({
      ok: false,
      confirm: true,
      reason: sensitiveWarning(findings),
      name: file.name,
    })
  }

  const load = await agentKnowledgeLoad(supabase, agentId)
  const refusal = attachRefusal({
    attachedChars: load.chars,
    attachedCount: load.count,
    incomingChars: chars,
  })
  if (refusal) return Response.json({ ok: false, reason: refusal })

  const title = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || file.name

  const { data: source, error: insertError } = await supabase
    .from('knowledge_sources')
    .insert({
      owner_id: userId,
      title,
      kind: 'file',
      content: text,
      char_count: chars,
      checksum: checksumOf(text),
      origin: {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        truncated,
      } as unknown as Json,
    })
    .select('id, title, kind, char_count')
    .single()

  if (insertError || !source) {
    return Response.json({ ok: false, reason: "We couldn't save that file." })
  }

  // RLS enforces both halves of this: the caller must own the agent and own
  // the source.
  const { error: linkError } = await supabase
    .from('agent_knowledge')
    .insert({ agent_id: agentId, source_id: source.id })
  if (linkError) {
    // Do not strand the source it would never be attached to: an unreachable
    // row in the library is worse than no row at all.
    await supabase.from('knowledge_sources').delete().eq('id', source.id)
    return Response.json({ ok: false, reason: "We couldn't attach that file." })
  }

  await recomposeAgentPrompt(supabase, agentId, userId)

  return Response.json({
    ok: true,
    source: {
      id: source.id,
      title: source.title,
      kind: source.kind,
      chars: source.char_count,
      truncated,
    },
  })
}
