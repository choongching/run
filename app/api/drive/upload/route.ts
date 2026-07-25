import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import { uploadDriveFile } from '@/lib/drive/upload-file'

// Upload a file from the user's machine into the company Drive so it can be
// pinned as agent knowledge. Types are limited to what the extraction
// pipeline can actually read at run time (lib/drive/read-file.ts); anything
// else would mount as noise.

const MAX_BYTES = 15 * 1024 * 1024

const ALLOWED: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain': 'text/plain',
  'text/csv': 'text/csv',
  // Markdown reads fine as plain text at extraction time.
  'text/markdown': 'text/plain',
}

export async function POST(request: Request) {
  const { error, supabase } = await requireUser()
  if (error) return error

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Files up to 15 MB are supported' },
      { status: 400 }
    )
  }
  const mimeType = ALLOWED[file.type]
  if (!mimeType) {
    return NextResponse.json(
      { error: 'Supported files: PDF, Word (.docx), text, Markdown, and CSV' },
      { status: 400 }
    )
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('pipedream_account_id, pipedream_connected_by')
    .not('id', 'is', null)
    .limit(1)
    .single()
  if (!settings?.pipedream_account_id || !settings.pipedream_connected_by) {
    return NextResponse.json(
      { error: 'Google Drive is not connected. Ask an admin to connect it.' },
      { status: 400 }
    )
  }

  try {
    const uploaded = await uploadDriveFile({
      name: file.name,
      mimeType,
      content: Buffer.from(await file.arrayBuffer()),
      // Proxy calls always use the connecting admin's ids, not the caller's.
      userId: settings.pipedream_connected_by,
      accountId: settings.pipedream_account_id,
    })
    return NextResponse.json({
      file: {
        file_id: uploaded.id,
        file_name: file.name,
        file_mime_type: mimeType,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
