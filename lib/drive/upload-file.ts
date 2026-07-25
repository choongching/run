import { randomUUID } from 'node:crypto'
import { getPipedreamClient } from '@/lib/pipedream/client'

// Direct upload of a user-provided file into the company Drive, so agent
// knowledge is not limited to files that already live there. Same raw-proxy
// multipart pattern as create-file.ts (the typed SDK corrupts POST bodies),
// but with NO conversion: the file keeps its original MIME type, and the
// body is assembled with Buffers so binary content (PDF, DOCX) survives.

const PROXY_BASE = 'https://api.pipedream.com/v1/connect'

export async function uploadDriveFile({
  name,
  mimeType,
  content,
  userId,
  accountId,
}: {
  name: string
  mimeType: string
  content: Buffer
  userId: string
  accountId: string
}): Promise<{ id: string }> {
  const pd = getPipedreamClient()
  const token = await pd.rawAccessToken
  const projectId = process.env.PIPEDREAM_PROJECT_ID!
  const environment =
    process.env.PIPEDREAM_ENVIRONMENT === 'production'
      ? 'production'
      : 'development'

  const boundary = `run_upload_${randomUUID().replaceAll('-', '')}`
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify({ name, mimeType }),
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        '',
        '',
      ].join('\r\n'),
      'utf-8'
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'),
  ])

  const target =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id'
  const url64 = Buffer.from(target).toString('base64')
  const contentType = `multipart/related; boundary=${boundary}`

  const res = await fetch(
    `${PROXY_BASE}/${projectId}/proxy/${encodeURIComponent(url64)}?external_user_id=${encodeURIComponent(userId)}&account_id=${encodeURIComponent(accountId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-pd-environment': environment,
        'Content-Type': contentType,
        'x-pd-proxy-Content-Type': contentType,
      },
      body,
    }
  )

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(`Drive upload failed (${res.status}): ${detail}`)
  }

  const file = (await res.json()) as { id?: string }
  if (!file.id) {
    throw new Error('Drive upload returned no file id')
  }
  return { id: file.id }
}
