import type { ConnectableApp } from '@/lib/pipedream/client'

// Custom tools the agent can call in chat (phase 3a: reads only). Each call
// surfaces as an agent.custom_tool_use event; the run loop executes it via the
// Pipedream proxy with the signed-in user's account and returns the result.
// Writes (gmail_create_draft) plus their approval gate come in phase 3b.

export type ToolName =
  | 'gmail_search'
  | 'gmail_get_message'
  | 'gmail_create_draft'
  | 'drive_list_files'
  | 'drive_read_file'

// Which connection each tool needs, so the run loop can surface a connect card
// when the user has not linked that app yet.
export const TOOL_APP: Record<ToolName, ConnectableApp> = {
  gmail_search: 'gmail',
  gmail_get_message: 'gmail',
  gmail_create_draft: 'gmail',
  drive_list_files: 'google_drive',
  drive_read_file: 'google_drive',
}

// Write tools have external side effects and must be approved by the user
// before they run ("writes ask first"). Reads execute silently.
export const WRITE_TOOLS = new Set<ToolName>(['gmail_create_draft'])

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name as ToolName)
}

// A human-readable summary of a write call for the approval card.
export function summarizeWrite(
  name: string,
  input: Record<string, unknown>
): { title: string; detail: string } {
  if (name === 'gmail_create_draft') {
    const to = String(input.to ?? '')
    const subject = String(input.subject ?? '(no subject)')
    const body = String(input.body ?? '')
    return {
      title: `Create a Gmail draft to ${to || 'someone'}`,
      detail: `Subject: ${subject}\n\n${body}`,
    }
  }
  return { title: `Run ${name.replace(/_/g, ' ')}`, detail: '' }
}

// CustomToolParams for the session's agent-with-overrides tools array. Typed
// loosely here; cast to the SDK type at the call site.
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'custom' as const,
    name: 'gmail_search',
    description:
      "Search the user's Gmail and return matching messages with sender, subject, date and a snippet. Use Gmail search syntax in `query` (e.g. 'is:unread newer_than:1d', 'from:boss@example.com'). Returns up to max_results messages.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: "Gmail search query. Empty for the most recent messages.",
        },
        max_results: {
          type: 'number',
          description: 'Maximum messages to return (default 15, max 25).',
        },
      },
      required: [],
    },
  },
  {
    type: 'custom' as const,
    name: 'gmail_get_message',
    description:
      'Fetch the full content of one Gmail message by its id (from gmail_search). Returns sender, recipients, subject, date and the plain-text body.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message_id: { type: 'string', description: 'The Gmail message id.' },
      },
      required: ['message_id'],
    },
  },
  {
    type: 'custom' as const,
    name: 'gmail_create_draft',
    description:
      "Create a draft email in the user's Gmail (it is NOT sent — it is saved as a draft for the user to review and send). Use this to draft replies or new messages. The user must approve the draft before it is created.",
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address.' },
        subject: { type: 'string', description: 'Email subject line.' },
        body: { type: 'string', description: 'Plain-text email body.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    type: 'custom' as const,
    name: 'drive_list_files',
    description:
      "List files in the user's Google Drive. Use `query` for a Drive full-text search (e.g. 'quarterly report'). Returns file id, name, type and modified time, up to max_results.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Full-text search; empty for recent files.' },
        max_results: {
          type: 'number',
          description: 'Maximum files to return (default 20, max 50).',
        },
      },
      required: [],
    },
  },
  {
    type: 'custom' as const,
    name: 'drive_read_file',
    description:
      "Read the text content of one Google Drive file by its id (from drive_list_files). Handles Google Docs, Sheets, PDFs, Word docs and plain text.",
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: { type: 'string', description: 'The Drive file id.' },
      },
      required: ['file_id'],
    },
  },
]
