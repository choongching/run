import type { SupabaseClient } from '@supabase/supabase-js'

import { requireUser } from '@/lib/api-helpers'
import { humanSize, kindOf, maxBytesFor } from '@/lib/files/accepted'
import { extractFile } from '@/lib/files/extract'
import { processImage } from '@/lib/files/image'
import type { Database, Json } from '@/lib/types/database'

// Attach a file to the current chat message. We extract it to text right here,
// on attach, so the composer can confirm the text is readable (or say why not)
// BEFORE the user sends. The extracted text is stashed on the thread and
// inlined into the next message; nothing persists as a knowledge base.
export const maxDuration = 60

async function getThreadId(
  supabase: SupabaseClient<Database>,
  agentId: string,
  userId: string
): Promise<string | null> {
  await supabase
    .from('threads')
    .upsert(
      { agent_id: agentId, user_id: userId },
      { onConflict: 'agent_id,user_id', ignoreDuplicates: true }
    )
  const { data } = await supabase
    .from('threads')
    .select('id')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return Response.json({ ok: false, reason: 'No file received.' }, { status: 400 })
  }

  // Enforce the same limits the composer shows, in case the request skipped it.
  const kind = kindOf(file.name, file.type)
  if (!kind) {
    return Response.json({ ok: false, reason: "That file type isn't supported yet." })
  }
  if (file.size > maxBytesFor(kind)) {
    return Response.json({
      ok: false,
      reason: `That file is ${humanSize(file.size)}. The limit is ${kind === 'image' ? '10' : '15'} MB.`,
    })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const threadId = await getThreadId(supabase, agentId, userId)
  if (!threadId) {
    return Response.json({ ok: false, reason: 'Thread not found.' }, { status: 404 })
  }

  if (kind === 'image') {
    // Native vision: resize, re-encode, and thumbnail. No text extraction.
    const result = await processImage(buffer)
    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason })
    }
    const pending = {
      kind: 'image' as const,
      name: file.name,
      type: file.type || 'image/png',
      size: file.size,
      data: result.data,
      mediaType: result.mediaType,
      thumb: result.thumb,
    }
    await supabase
      .from('threads')
      .update({ pending_attachment: pending as unknown as Json })
      .eq('id', threadId)
    return Response.json({
      ok: true,
      kind: 'image',
      name: file.name,
      type: pending.type,
      size: file.size,
      thumb: result.thumb,
    })
  }

  // Document: extract to text.
  const result = await extractFile(buffer, file.name, file.type)
  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason })
  }
  const pending = {
    kind: 'document' as const,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    text: result.text,
  }
  await supabase
    .from('threads')
    .update({ pending_attachment: pending as unknown as Json })
    .eq('id', threadId)

  return Response.json({
    ok: true,
    kind: 'document',
    name: file.name,
    type: pending.type,
    size: file.size,
    chars: result.chars,
    truncated: result.truncated,
  })
}

// Remove the pending attachment (the user cleared the chip before sending).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  await supabase
    .from('threads')
    .update({ pending_attachment: null })
    .eq('agent_id', agentId)
    .eq('user_id', userId)

  return Response.json({ ok: true })
}
