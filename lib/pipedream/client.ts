import { PipedreamClient } from '@pipedream/sdk'

// Server-side only, never import from client components: the client secret
// must never reach the browser. All Google API calls go through pd.proxy so
// Google tokens stay in Pipedream.

export const GOOGLE_DRIVE_APP_SLUG = 'google_drive'
export const GMAIL_APP_SLUG = 'gmail'
export const JINA_APP_SLUG = 'jina_ai'

// Apps a user can connect for their agents (per-user, phase 3). Gmail and
// Drive are SEPARATE Pipedream apps with separate accounts and OAuth scopes.
// Jina is here for a different reason from the other two. Gmail and Drive are
// things an agent cannot do at all until you connect them. Search already
// works; connecting Jina only changes whose key pays for it. Brave is
// deliberately absent: Pipedream reports it with proxy_enabled false, so a
// user's Brave key could only reach Brave by passing through us.
export const CONNECTABLE_APPS = {
  gmail: { slug: GMAIL_APP_SLUG, label: 'Gmail' },
  google_drive: { slug: GOOGLE_DRIVE_APP_SLUG, label: 'Google Drive' },
  jina_ai: { slug: JINA_APP_SLUG, label: 'Jina' },
} as const

export type ConnectableApp = keyof typeof CONNECTABLE_APPS

let client: PipedreamClient | null = null

export function getPipedreamClient(): PipedreamClient {
  if (!client) {
    const projectId = process.env.PIPEDREAM_PROJECT_ID
    const clientId = process.env.PIPEDREAM_CLIENT_ID
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET
    if (!projectId || !clientId || !clientSecret) {
      throw new Error(
        'Missing PIPEDREAM_PROJECT_ID, PIPEDREAM_CLIENT_ID, or PIPEDREAM_CLIENT_SECRET'
      )
    }
    client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
      projectEnvironment:
        process.env.PIPEDREAM_ENVIRONMENT === 'production' ? 'production' : 'development',
    })
  }
  return client
}
