import { randomUUID } from 'node:crypto'
import { getPipedreamClient } from '@/lib/pipedream/client'
import type { MissionOutputType } from '@/lib/types/database'

// Server-side creation of mission output files in Google Drive, called after
// a mission run completes. Throws on failure — the run route catches and
// falls back to output_text so the mission never loses its result.
//
// The Pipedream google_drive app only proxies www.googleapis.com, so the
// spec's Docs/Sheets batchUpdate APIs are unreachable. Instead we use Drive's
// multipart upload with conversion: text/plain content with a
// google-apps.document target MIME becomes a real Google Doc (CSV becomes a
// Sheet). "pdf" is a converted Doc whose URL points at Drive's PDF export.
//
// The typed SDK proxy client JSON-serializes every POST body, which corrupts
// multipart payloads — so this file calls the proxy REST endpoint directly
// with a raw body (verified live: the proxy forwards it byte-for-byte).

const PROXY_BASE = 'https://api.pipedream.com/v1/connect'

export async function createDriveFile({
  type,
  title,
  content,
  userId,
  accountId,
}: {
  type: Exclude<MissionOutputType, 'text'>
  title: string
  content: string
  userId: string
  accountId: string
}): Promise<{ id: string; url: string }> {
  const pd = getPipedreamClient()
  const token = await pd.rawAccessToken
  const projectId = process.env.PIPEDREAM_PROJECT_ID!
  const environment =
    process.env.PIPEDREAM_ENVIRONMENT === 'production'
      ? 'production'
      : 'development'

  const isSheet = type === 'sheet'
  const metadata = {
    name: title,
    mimeType: isSheet
      ? 'application/vnd.google-apps.spreadsheet'
      : 'application/vnd.google-apps.document',
  }

  const boundary = `run_output_${randomUUID().replaceAll('-', '')}`
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${isSheet ? 'text/csv' : 'text/plain'}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n')

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

  const url =
    type === 'sheet'
      ? `https://docs.google.com/spreadsheets/d/${file.id}/edit`
      : type === 'pdf'
        ? `https://docs.google.com/document/d/${file.id}/export?format=pdf`
        : `https://docs.google.com/document/d/${file.id}/edit`

  return { id: file.id, url }
}
