import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { getPipedreamClient } from '@/lib/pipedream/client'

// Lists Google Drive files usable as agent knowledge, via the org connection.
// Only the supported knowledge formats are returned.

const SUPPORTED_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'text/plain',
  'text/csv',
]

type DriveFileList = {
  files?: { id: string; name: string; mimeType: string; modifiedTime?: string }[]
  nextPageToken?: string
}

export async function GET(request: Request) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: settings } = await supabase
    .from('company_settings')
    .select('pipedream_account_id, pipedream_connected_by')
    .not('id', 'is', null)
    .limit(1)
    .single()
  if (!settings?.pipedream_account_id || !settings.pipedream_connected_by) {
    return NextResponse.json({ error: 'Google Drive is not connected' }, { status: 409 })
  }

  const pageToken = new URL(request.url).searchParams.get('pageToken')
  const q =
    '(' +
    SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ') +
    ') and trashed = false'

  try {
    const pd = getPipedreamClient()
    const result = (await pd.proxy.get({
      url: 'https://www.googleapis.com/drive/v3/files',
      externalUserId: settings.pipedream_connected_by,
      accountId: settings.pipedream_account_id,
      params: {
        q,
        orderBy: 'modifiedTime desc',
        pageSize: '50',
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
        ...(pageToken ? { pageToken } : {}),
      },
    })) as DriveFileList

    return NextResponse.json({
      files: result.files ?? [],
      next_page_token: result.nextPageToken ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not list Drive files'
    // Proxy failures here usually mean the Google grant was revoked or
    // expired; point the admin at the fix instead of a bare error.
    return NextResponse.json(
      {
        error: `${message}. If this keeps happening, reconnect Google Drive under Admin > Integrations.`,
      },
      { status: 502 }
    )
  }
}
