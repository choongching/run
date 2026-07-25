import type { SupabaseClient } from '@supabase/supabase-js'

import { getUserConnection } from '@/lib/pipedream/connections'
import { driveListFiles, driveReadFile } from '@/lib/tools/drive'
import { gmailGetMessage, gmailSearch } from '@/lib/tools/gmail'
import { TOOL_APP, type ToolName } from '@/lib/tools/definitions'
import type { ConnectableApp } from '@/lib/pipedream/client'
import type { Database } from '@/lib/types/database'

export type ToolOutcome =
  | { kind: 'needs_connection'; app: ConnectableApp }
  | { kind: 'result'; text: string }
  | { kind: 'error'; text: string }

const KNOWN_TOOLS = new Set<ToolName>([
  'gmail_search',
  'gmail_get_message',
  'drive_list_files',
  'drive_read_file',
])

// Execute one agent tool call against the signed-in user's connected account.
// Reads only (phase 3a); returns a needs_connection outcome when the user has
// not linked the app the tool requires.
export async function executeTool(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
  input: Record<string, unknown>
): Promise<ToolOutcome> {
  if (!KNOWN_TOOLS.has(name as ToolName)) {
    return { kind: 'error', text: `Unknown tool: ${name}` }
  }
  const tool = name as ToolName
  const app = TOOL_APP[tool]

  const accountId = await getUserConnection(supabase, userId, app)
  if (!accountId) {
    return { kind: 'needs_connection', app }
  }

  try {
    switch (tool) {
      case 'gmail_search': {
        const results = await gmailSearch({
          userId,
          accountId,
          query: typeof input.query === 'string' ? input.query : undefined,
          maxResults:
            typeof input.max_results === 'number' ? input.max_results : undefined,
        })
        return { kind: 'result', text: JSON.stringify(results) }
      }
      case 'gmail_get_message': {
        const message = await gmailGetMessage({
          userId,
          accountId,
          messageId: String(input.message_id ?? ''),
        })
        return { kind: 'result', text: JSON.stringify(message) }
      }
      case 'drive_list_files': {
        const files = await driveListFiles({
          userId,
          accountId,
          query: typeof input.query === 'string' ? input.query : undefined,
          maxResults:
            typeof input.max_results === 'number' ? input.max_results : undefined,
        })
        return { kind: 'result', text: JSON.stringify(files) }
      }
      case 'drive_read_file': {
        const file = await driveReadFile({
          userId,
          accountId,
          fileId: String(input.file_id ?? ''),
        })
        return { kind: 'result', text: JSON.stringify(file) }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { kind: 'error', text: `Tool ${tool} failed: ${message}` }
  }
}
