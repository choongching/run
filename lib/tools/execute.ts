import type { SupabaseClient } from '@supabase/supabase-js'

import { getUserConnection } from '@/lib/pipedream/connections'
import {
  driveCreateFolder,
  driveListFiles,
  driveMoveFile,
  driveReadFile,
  driveRenameFile,
} from '@/lib/tools/drive'
import {
  gmailCreateDraft,
  gmailGetMessage,
  gmailSearch,
} from '@/lib/tools/gmail'
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
  'gmail_create_draft',
  'drive_list_files',
  'drive_read_file',
  'drive_create_folder',
  'drive_move_file',
  'drive_rename_file',
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
      case 'gmail_create_draft': {
        const draft = await gmailCreateDraft({
          userId,
          accountId,
          to: String(input.to ?? ''),
          subject: String(input.subject ?? ''),
          body: String(input.body ?? ''),
        })
        return {
          kind: 'result',
          text: `Draft created (id ${draft.draft_id}). It is saved in the user's Gmail drafts, not sent.`,
        }
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
      case 'drive_create_folder': {
        const folder = await driveCreateFolder({
          userId,
          accountId,
          name: String(input.name ?? ''),
          parentId: input.parent_id ? String(input.parent_id) : undefined,
        })
        return {
          kind: 'result',
          text: `Folder created (id ${folder.folder_id}). Use this id as folder_id when moving files into it.`,
        }
      }
      case 'drive_move_file': {
        await driveMoveFile({
          userId,
          accountId,
          fileId: String(input.file_id ?? ''),
          folderId: String(input.folder_id ?? ''),
        })
        return {
          kind: 'result',
          text: `Moved "${String(input.file_name ?? 'the file')}" into "${String(input.folder_name ?? 'the folder')}".`,
        }
      }
      case 'drive_rename_file': {
        const renamed = await driveRenameFile({
          userId,
          accountId,
          fileId: String(input.file_id ?? ''),
          newName: String(input.new_name ?? ''),
        })
        return { kind: 'result', text: `Renamed to "${renamed.name}".` }
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
    // This text goes to the agent, not to the screen, so that it can explain
    // the problem in its own words or try another way. That makes it the one
    // path where a raw provider payload could still reach a person, by being
    // quoted back at them, so strip anything machine shaped before it gets
    // anywhere near the model.
    const raw = err instanceof Error ? err.message : String(err)
    const message = raw
      .replace(/\{[\s\S]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    console.error(`tool ${tool} failed`, err)
    return {
      kind: 'error',
      text: `The ${tool} step did not work${message ? `: ${message}` : ''}. Tell the user plainly what you could not do, in your own words. Never show them this message, an error code, or anything that looks like machine output.`,
    }
  }
}
