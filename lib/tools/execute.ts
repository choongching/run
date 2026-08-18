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
import { MAX_RESULTS, isRecency } from '@/lib/search/limits'
import { resolveProvider, SearchUnavailableError } from '@/lib/search/resolve'
import { formatSearchResults } from '@/lib/search/format'
import { recordSearch } from '@/lib/search/usage'
import { canSearch } from '@/lib/entitlements/assert'
import { ourSearchEnabled } from '@/lib/search/flag'
import { readToolCeiling } from '@/lib/anthropic/client'
import type { ConnectableApp } from '@/lib/pipedream/client'
import type { Database } from '@/lib/types/database'

export type ToolOutcome =
  | { kind: 'needs_connection'; app: ConnectableApp }
  // `billed` marks work that went on OUR bill and belongs in the cost column.
  // Carried back from the executor rather than inferred by the caller, because
  // the caller cannot see which provider answered: the same search_web call is
  // our spend or the user's depending on what they have connected, and only
  // the ladder in resolve.ts knows which.
  | { kind: 'result'; text: string; billed?: boolean }
  | { kind: 'error'; text: string }

const KNOWN_TOOLS = new Set<ToolName>([
  'search_web',
  'gmail_search',
  'gmail_get_message',
  'gmail_create_draft',
  'drive_list_files',
  'drive_read_file',
  'drive_create_folder',
  'drive_move_file',
  'drive_rename_file',
])

// Everything one tool call needs to run. A named-args object rather than a
// growing positional list, matching the convention in lib/tools/drive.ts, and
// because the next tool needs the agent as well as the user: a setting can be
// switched off after a session was created, and the session will keep offering
// the tool until it is rebuilt. The executor is the last place that can say no.
export type ToolContext = {
  supabase: SupabaseClient<Database>
  userId: string
  agentId: string
  name: string
  input: Record<string, unknown>
}

// Execute one agent tool call against the signed-in user's connected account.
// Returns a needs_connection outcome when the user has not linked the app the
// tool requires.
export async function executeTool(ctx: ToolContext): Promise<ToolOutcome> {
  const { supabase, userId, name, input } = ctx
  if (!KNOWN_TOOLS.has(name as ToolName)) {
    return { kind: 'error', text: `Unknown tool: ${name}` }
  }
  const tool = name as ToolName

  // Tools that run on our own credentials are handled before the connection
  // lookup: there is nothing to look up, and a connect card would be a dead
  // end. Named explicitly rather than inferred from TOOL_APP so the switch
  // below stays exhaustive, which is what makes a new tool a compile error
  // instead of a silent fall-through.
  if (tool === 'search_web') {
    return runSearchWeb(supabase, userId, ctx.agentId, input)
  }

  const app = TOOL_APP[tool]
  if (app === null) {
    // Declared as needing no account, but nothing above handles it. Fail
    // closed rather than continuing into a lookup that cannot succeed.
    return { kind: 'error', text: `Unknown tool: ${tool}` }
  }

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

// Web search. Runs on our own key rather than a connected account, which is why
// it sits outside the switch above: the connection-required path stays one
// straight line with no exceptions threaded through it.
async function runSearchWeb(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string,
  input: Record<string, unknown>
): Promise<ToolOutcome> {
  const query = String(input.query ?? '').trim()
  if (!query) {
    return { kind: 'error', text: 'Say what to search for and try again.' }
  }

  // Asked again here, not just when the session was built. Tools bind at
  // session creation and a session outlives the settings it was created from,
  // so an agent whose search was switched off an hour ago can still emit the
  // call until its session is rebuilt. The executor is the last place that can
  // say no, and it is the only one that reads the setting as it is now.
  if (!ourSearchEnabled()) {
    return {
      kind: 'error',
      text: 'Web search is not available right now. Tell the user you could not search, in your own words, and answer from what you already know if you can.',
    }
  }
  const { data: agentRow } = await supabase
    .from('agents')
    .select('enabled_tools')
    .eq('id', agentId)
    .maybeSingle()
  if (!readToolCeiling(agentRow?.enabled_tools).web_search) {
    return {
      kind: 'error',
      text: 'Web search is switched off for this agent. Tell the user you cannot search the web, in your own words, and answer from what you already know if you can.',
    }
  }

  try {
    const { provider, billedToUs } = await resolveProvider({ supabase, userId })

    // Checked before the call, not after. A search that has already happened
    // has already cost us the money, so refusing afterwards protects nothing.
    //
    // Only when we are the ones paying. A search on the person's own connected
    // account is not our bill and is not ours to cap, which is exactly what
    // connecting an account buys.
    if (billedToUs) {
      const allowance = await canSearch(supabase, userId)
      if (!allowance.ok) {
        // An error result rather than a thrown one, so the model reads it and
        // tells the user in its own words instead of the turn falling over.
        return { kind: 'error', text: allowance.reason }
      }
    }

    const recency = isRecency(input.recency) ? input.recency : undefined
    const result = await provider.search(query, { count: MAX_RESULTS, recency })

    // Counted after the provider answered, and awaited. A call that threw cost
    // us nothing, so a failed search does not spend anyone's allowance. Awaited
    // because the alternative is a write dropped when the stream closes, which
    // is a search we paid for and gave away.
    if (billedToUs) await recordSearch(userId)

    return {
      kind: 'result',
      text: formatSearchResults(query, result, recency),
      billed: billedToUs,
    }
  } catch (err) {
    if (err instanceof SearchUnavailableError) {
      // A deployment problem, not the user's. Say so plainly and do not invite
      // a retry that will fail the same way.
      console.error('search unavailable:', err.message)
      return {
        kind: 'error',
        text: 'Web search is not available right now. Tell the user you could not search, in your own words, and answer from what you already know if you can.',
      }
    }
    throw err
  }
}
