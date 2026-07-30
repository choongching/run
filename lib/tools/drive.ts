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

// Drive writes (create folder, move, rename) go through the same proxy. They
// only ever run after the user approves the call, so these functions can act
// directly: the gate lives in the run loop, not here.

export async function driveCreateFolder(args: {
  userId: string
  accountId: string
  name: string
  parentId?: string
}): Promise<{ folder_id: string }> {
  const pd = getPipedreamClient()
  const res = (await pd.proxy.post({
    url: `${DRIVE_BASE}/files?supportsAllDrives=true`,
    externalUserId: args.userId,
    accountId: args.accountId,
    body: {
      name: args.name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(args.parentId ? { parents: [args.parentId] } : {}),
    },
  })) as { id?: string }
  return { folder_id: res.id ?? '' }
}

export async function driveRenameFile(args: {
  userId: string
  accountId: string
  fileId: string
  newName: string
}): Promise<{ name: string }> {
  const pd = getPipedreamClient()
  const res = (await pd.proxy.patch({
    url: `${DRIVE_BASE}/files/${args.fileId}?supportsAllDrives=true`,
    externalUserId: args.userId,
    accountId: args.accountId,
    body: { name: args.newName },
  })) as { name?: string }
  return { name: res.name ?? args.newName }
}

export async function driveMoveFile(args: {
  userId: string
  accountId: string
  fileId: string
  folderId: string
}): Promise<{ moved: true }> {
  const pd = getPipedreamClient()
  // Moving in Drive v3 is swapping parents, so the current parents have to be
  // read first to be removed; otherwise the file ends up in both places.
  const meta = (await pd.proxy.get({
    url: `${DRIVE_BASE}/files/${args.fileId}?fields=parents&supportsAllDrives=true`,
    externalUserId: args.userId,
    accountId: args.accountId,
  })) as { parents?: string[] }
  const params = new URLSearchParams({
    addParents: args.folderId,
    supportsAllDrives: 'true',
  })
  const previous = (meta.parents ?? []).join(',')
  if (previous) params.set('removeParents', previous)
  await pd.proxy.patch({
    url: `${DRIVE_BASE}/files/${args.fileId}?${params.toString()}`,
    externalUserId: args.userId,
    accountId: args.accountId,
    body: {},
  })
  return { moved: true }
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
