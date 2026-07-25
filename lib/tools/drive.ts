import { getPipedreamClient } from '@/lib/pipedream/client'
import { readDriveFile } from '@/lib/drive/read-file'

// Drive reads through the Pipedream proxy (www.googleapis.com). Per-user:
// accountId is the user's own connected google_drive account.

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'

type DriveFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
}

export async function driveListFiles(args: {
  userId: string
  accountId: string
  query?: string
  maxResults?: number
}): Promise<DriveFile[]> {
  const n = Math.min(Math.max(args.maxResults ?? 20, 1), 50)
  const params = new URLSearchParams({
    pageSize: String(n),
    fields: 'files(id,name,mimeType,modifiedTime)',
    orderBy: 'modifiedTime desc',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  if (args.query) {
    // Escape single quotes for the Drive query language.
    const escaped = args.query.replace(/'/g, "\\'")
    params.set('q', `fullText contains '${escaped}' and trashed = false`)
  } else {
    params.set('q', 'trashed = false')
  }
  const pd = getPipedreamClient()
  const res = (await pd.proxy.get({
    url: `${DRIVE_BASE}/files?${params.toString()}`,
    externalUserId: args.userId,
    accountId: args.accountId,
  })) as { files?: DriveFile[] }
  return res.files ?? []
}

export async function driveReadFile(args: {
  userId: string
  accountId: string
  fileId: string
}): Promise<{ name: string; content: string }> {
  const pd = getPipedreamClient()
  const meta = (await pd.proxy.get({
    url: `${DRIVE_BASE}/files/${args.fileId}?fields=name,mimeType&supportsAllDrives=true`,
    externalUserId: args.userId,
    accountId: args.accountId,
  })) as { name?: string; mimeType?: string }

  const content = await readDriveFile({
    fileId: args.fileId,
    mimeType: meta.mimeType ?? '',
    userId: args.userId,
    accountId: args.accountId,
  })
  return { name: meta.name ?? args.fileId, content }
}
