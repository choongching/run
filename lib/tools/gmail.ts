import { getPipedreamClient } from '@/lib/pipedream/client'

// Gmail reads through the Pipedream proxy (gmail.googleapis.com is allowed on
// the `gmail` app). external_user_id is the user's uuid; accountId is their
// connected gmail account.

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

type Header = { name: string; value: string }
type Payload = {
  mimeType?: string
  headers?: Header[]
  body?: { data?: string }
  parts?: Payload[]
}

async function proxyGet<T>(
  url: string,
  userId: string,
  accountId: string
): Promise<T> {
  const pd = getPipedreamClient()
  return (await pd.proxy.get({
    url,
    externalUserId: userId,
    accountId,
  })) as T
}

function header(headers: Header[] | undefined, name: string): string {
  return (
    headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    ''
  )
}

// Depth-first search for the first text/plain part; falls back to any text.
function extractBody(payload: Payload | undefined): string {
  if (!payload) return ''
  if (payload.body?.data && payload.mimeType?.startsWith('text/')) {
    const text = Buffer.from(payload.body.data, 'base64url').toString('utf-8')
    if (payload.mimeType === 'text/plain') return text
  }
  for (const part of payload.parts ?? []) {
    const found = extractBody(part)
    if (found) return found
  }
  // Last resort: any decodable body.
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  }
  return ''
}

export type GmailSearchResult = {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
}

export async function gmailSearch(args: {
  userId: string
  accountId: string
  query?: string
  maxResults?: number
}): Promise<GmailSearchResult[]> {
  const n = Math.min(Math.max(args.maxResults ?? 15, 1), 25)
  const q = args.query ? `&q=${encodeURIComponent(args.query)}` : ''
  const list = await proxyGet<{ messages?: { id: string }[] }>(
    `${GMAIL_BASE}/messages?maxResults=${n}${q}`,
    args.userId,
    args.accountId
  )
  const ids = (list.messages ?? []).map((m) => m.id)

  const results: GmailSearchResult[] = []
  for (const id of ids) {
    const msg = await proxyGet<{ snippet?: string; payload?: Payload }>(
      `${GMAIL_BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      args.userId,
      args.accountId
    )
    results.push({
      id,
      from: header(msg.payload?.headers, 'From'),
      subject: header(msg.payload?.headers, 'Subject'),
      date: header(msg.payload?.headers, 'Date'),
      snippet: msg.snippet ?? '',
    })
  }
  return results
}

export async function gmailGetMessage(args: {
  userId: string
  accountId: string
  messageId: string
}): Promise<{
  from: string
  to: string
  subject: string
  date: string
  body: string
}> {
  const msg = await proxyGet<{ payload?: Payload }>(
    `${GMAIL_BASE}/messages/${args.messageId}?format=full`,
    args.userId,
    args.accountId
  )
  const body = extractBody(msg.payload).trim()
  return {
    from: header(msg.payload?.headers, 'From'),
    to: header(msg.payload?.headers, 'To'),
    subject: header(msg.payload?.headers, 'Subject'),
    date: header(msg.payload?.headers, 'Date'),
    body: body || '(no readable text body)',
  }
}
