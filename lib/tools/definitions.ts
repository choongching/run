import type { ConnectableApp } from '@/lib/pipedream/client'

// Custom tools the agent can call in chat. Each call surfaces as an
// agent.custom_tool_use event; the run loop auto-executes read tools via the
// Pipedream proxy with the signed-in user's account, and pauses every other
// tool (writes and anything unclassified) for user approval before it runs.

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
// before they run ("writes ask first").
export const WRITE_TOOLS = new Set<ToolName>(['gmail_create_draft'])

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name as ToolName)
}

// SECURITY: the explicit allowlist of tools safe to auto-execute without asking
// the user (read-only, no external side effects). The run loop gates EVERYTHING
// not in this set, so a new tool defaults to approval-required even if someone
// forgets to classify it. Only add a tool here after confirming it cannot
// mutate the user's data or reach outside. This is the enforcement point for
// "reads free, writes ask first".
export const READ_TOOLS = new Set<ToolName>([
  'gmail_search',
  'gmail_get_message',
  'drive_list_files',
  'drive_read_file',
])

export function isReadTool(name: string): boolean {
  return READ_TOOLS.has(name as ToolName)
}

// ask_user is neither a read nor a write: it pauses the turn to ask the user a
// question (with tappable options), then resumes with their answer. It drives
// the first-run setup interview.
export const ASK_USER_TOOL = 'ask_user'

export function isAskTool(name: string): boolean {
  return name === ASK_USER_TOOL
}

export type AskOption = { value: string; label: string; description?: string }

export type AskSpec = {
  question: string
  help?: string
  options: AskOption[]
  allowOther: boolean
  step?: number
  total?: number
}

// Normalize an ask_user tool call into the props the options card renders.
// Tolerant of loose model output (missing labels, non-array options).
export function summarizeAsk(input: Record<string, unknown>): AskSpec {
  const rawOptions = Array.isArray(input.options) ? input.options : []
  const options = rawOptions
    .map((o): AskOption | null => {
      const obj = (o ?? {}) as Record<string, unknown>
      const label = String(obj.label ?? obj.value ?? '').trim()
      const value = String(obj.value ?? obj.label ?? '').trim()
      if (!label && !value) return null
      return {
        value: value || label,
        label: label || value,
        description: obj.description ? String(obj.description).trim() : undefined,
      }
    })
    .filter((o): o is AskOption => o !== null)

  return {
    question: String(input.question ?? '').trim() || 'Which fits best?',
    help: input.help ? String(input.help).trim() : undefined,
    options,
    allowOther: input.allow_other !== false,
    step: typeof input.step === 'number' ? input.step : undefined,
    total: typeof input.total === 'number' ? input.total : undefined,
  }
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
      "Create a draft email in the user's Gmail (it is NOT sent; it is saved as a draft for the user to review and send). Use this to draft replies or new messages. The user must approve the draft before it is created.",
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
  {
    type: 'custom' as const,
    name: 'ask_user',
    description:
      "Ask the user ONE focused question and pause for their answer. Use this to run the first-run setup interview (understand what they want and how they want it) and any time a choice is bounded. Give 3 to 6 concrete `options`, each with a short bold `label` and a one-line `description` of what it means. Set `step` and `total` to show progress (e.g. step 1 of 3). The user can also type a free-text answer unless you set allow_other to false. Ask one question per call and wait for the answer before asking the next; keep going until the goal is clear, then confirm what you understood.",
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'The single question to ask.' },
        help: {
          type: 'string',
          description: 'One line of supporting context shown under the question.',
        },
        options: {
          type: 'array',
          description: 'The choices to offer, 3 to 6 is ideal.',
          items: {
            type: 'object',
            properties: {
              value: {
                type: 'string',
                description: 'Short stable value (falls back to label).',
              },
              label: { type: 'string', description: 'Bold choice label the user sees.' },
              description: {
                type: 'string',
                description: 'One-line explanation of this choice.',
              },
            },
            required: ['label'],
          },
        },
        allow_other: {
          type: 'boolean',
          description: 'Allow a free-text answer (default true).',
        },
        step: {
          type: 'number',
          description: 'Current question number, for the progress indicator.',
        },
        total: {
          type: 'number',
          description: 'Total planned questions, for the progress indicator.',
        },
      },
      required: ['question'],
    },
  },
]
