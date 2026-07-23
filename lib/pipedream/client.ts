import { PipedreamClient } from '@pipedream/sdk'

// Server-side only, never import from client components: the client secret
// must never reach the browser. All Google API calls go through pd.proxy so
// Google tokens stay in Pipedream.

export const GOOGLE_DRIVE_APP_SLUG = 'google_drive'

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
