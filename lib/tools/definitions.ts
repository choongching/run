import type { ConnectableApp } from '@/lib/pipedream/client'
import type { RoutineRule } from '@/lib/routines/rule'

// Custom tools the agent can call in chat. Each call surfaces as an
// agent.custom_tool_use event; the run loop auto-executes read tools via the
// Pipedream proxy with the signed-in user's account, and pauses every other
// tool (writes and anything unclassified) for user approval before it runs.

export type ToolName =
  | 'search_web'
  | 'gmail_search'
  | 'gmail_get_message'
  | 'gmail_create_draft'
  | 'drive_list_files'
  | 'drive_read_file'
  | 'drive_create_folder'
  | 'drive_move_file'
  | 'drive_rename_file'

// Which connection each tool needs, so the run loop can surface a connect card
// when the user has not linked that app yet.
//
// null means the tool works without any connected account. Kept as a TOTAL
// record rather than a partial one: a new ToolName with no entry is a compile
// error, which is the property that stops a future tool from reaching
// executeTool without anyone deciding whether it needs an account.
export const TOOL_APP: Record<ToolName, ConnectableApp | null> = {
  // Web search runs on our own key, or later on the user's connected search
  // account. Neither is a per-tool requirement, so there is nothing to gate on.
  search_web: null,
  gmail_search: 'gmail',
  gmail_get_message: 'gmail',
  gmail_create_draft: 'gmail',
  drive_list_files: 'google_drive',
  drive_read_file: 'google_drive',
  drive_create_folder: 'google_drive',
  drive_move_file: 'google_drive',
  drive_rename_file: 'google_drive',
}

// Write tools have external side effects and must be approved by the user
// before they run ("writes ask first").
export const WRITE_TOOLS = new Set<ToolName>([
  'gmail_create_draft',
  'drive_create_folder',
  'drive_move_file',
  'drive_rename_file',
])

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
  // A GET against a search API. It reads the public web, touches nothing of the
  // user's, and has no side effect to approve. Its own caps (results, snippet
  // length, searches per drain, monthly allowance) are what bound it, not the
  // approval gate.
  'search_web',
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

// propose_setup ends the setup interview by showing the user what the agent is
// about to become, and waiting. It pauses the turn exactly like a question
// does, because the point of it is to stop.
//
// The agent writes the proposal rather than the server, so that a person who
// says "no, I meant invoices" gets a rewritten card instead of a nice reply
// next to a stale one. It rides the closing turn the interview already takes.
export const PROPOSE_SETUP_TOOL = 'propose_setup'

export function isProposeTool(name: string): boolean {
  return name === PROPOSE_SETUP_TOOL
}

export type SetupProposal = {
  name: string
  instructions: string
  // Their answer to "what starts me off", in their words ("Once a week").
  // Absent when the job is a one-off or they would rather just ask.
  cadence?: string
}

// Normalize a propose_setup call into what the review card renders. Tolerant
// of loose model output; the caller supplies fallbacks for anything missing so
// the card can always be drawn.
export function summarizeProposal(
  input: Record<string, unknown>,
  fallback: SetupProposal
): SetupProposal {
  const name = String(input.name ?? '').trim()
  const instructions = String(input.instructions ?? '').trim()
  const cadence = String(input.how_often ?? '').trim()
  return {
    name: name.slice(0, 60) || fallback.name,
    instructions: instructions || fallback.instructions,
    cadence: cadence ? cadence.slice(0, 60) : fallback.cadence,
  }
}

// set_routine puts the agent on a schedule. It is deliberately NOT on the
// auto-run list: a routine spends runs from the monthly allowance while
// nobody is watching, so it pauses the turn like a write and the user
// confirms from a card that shows the real run dates before anything exists.
export const SET_ROUTINE_TOOL = 'set_routine'

export function isSetRoutineTool(name: string): boolean {
  return name === SET_ROUTINE_TOOL
}

// What the routine card renders and the approve route creates: the rule
// without its anchor or timezone, which the server stamps at confirm time
// (the model knows neither).
export type RoutineDraft = {
  name: string
  instruction: string
  rule: Omit<RoutineRule, 'anchor' | 'tz'>
}

const WEEKDAY_NUMBERS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

const FREQ_ALIASES: Record<string, 'hour' | 'day' | 'week' | 'month'> = {
  hour: 'hour',
  hourly: 'hour',
  day: 'day',
  daily: 'day',
  week: 'week',
  weekly: 'week',
  month: 'month',
  monthly: 'month',
}

// Normalize a set_routine call into a draft, tolerant of loose model output
// (day names instead of numbers, "daily" instead of "day", a stringly month
// day). Returns null only when the schedule is unusable, in which case the
// caller bounces the call back to the model instead of showing a broken card.
export function summarizeRoutine(
  input: Record<string, unknown>
): RoutineDraft | null {
  const freq = FREQ_ALIASES[String(input.freq ?? '').toLowerCase().trim()]
  if (!freq) return null

  const interval = Math.trunc(Number(input.interval ?? 1))
  const hour = Math.trunc(Number(input.hour ?? 9))
  const minute = Math.trunc(Number(input.minute ?? 0))
  if (!Number.isFinite(interval) || interval < 1 || interval > 99) return null
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null

  let byday: number[] | undefined
  if (Array.isArray(input.byday)) {
    const days = input.byday
      .map((d) =>
        typeof d === 'number' ? d : WEEKDAY_NUMBERS[String(d).toLowerCase().trim()]
      )
      .filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
    byday = days.length > 0 ? [...new Set(days)].sort() : undefined
  }

  let monthDay: number | 'last' | undefined
  const rawMonthDay = input.month_day ?? input.monthDay
  if (rawMonthDay !== undefined && rawMonthDay !== null) {
    if (String(rawMonthDay).toLowerCase().trim() === 'last') monthDay = 'last'
    else {
      const d = Math.trunc(Number(rawMonthDay))
      if (Number.isFinite(d) && d >= 1 && d <= 31) monthDay = d
    }
  }

  const name = String(input.name ?? '').trim().slice(0, 80)
  const instruction = String(input.instruction ?? '').trim()
  if (!name || !instruction) return null

  return {
    name,
    instruction,
    rule: { freq, interval, byday, monthDay, hour, minute },
  }
}

// create_document is neither a read nor an external write: it produces a
// downloadable Markdown artifact IN the chat, with no external side effect
// (nothing leaves the app). It auto-runs like a read.
export const CREATE_DOCUMENT_TOOL = 'create_document'

export function isCreateDocumentTool(name: string): boolean {
  return name === CREATE_DOCUMENT_TOOL
}

// Tools safe to auto-run without approval: read-only tools, plus create_document
// (in-chat artifact, no external effect). Everything else (real writes,
// unclassified tools) stays approval-gated, so the safe-by-default guarantee
// still holds, this is only ever widened by an explicit, reviewed classification.
export function isAutoRunTool(name: string): boolean {
  return isReadTool(name) || isCreateDocumentTool(name)
}

// Pull a document artifact out of a create_document call, tolerant of loose
// model output.
//
// Web-search results reach the model wrapped in <cite index="..."> tags, and
// when it quotes them the tags come along, in documents (tool input the model
// wrote) and, it turns out, in chat replies too. The sentence inside the tag
// is the content, so keep it and drop the markup. Documents are cleaned here
// at creation; replies are cleaned in run-turn at persistence and in the
// Markdown renderer for live streams and already-stored rows.
export function stripCiteTags(text: string): string {
  return text.replace(/<\/?cite\b[^>]*>/g, '')
}

export function summarizeDocument(input: Record<string, unknown>): {
  title: string
  content: string
} {
  return {
    title: stripCiteTags(String(input.title ?? '')).trim() || 'Document',
    content: stripCiteTags(String(input.content ?? '')).trim(),
  }
}

export type AskOption = { value: string; label: string; description?: string }

export type AskQuestion = {
  // Two or three words naming what this one is about, shown in the card's
  // header beside the counter. Optional: the counter carries the sequence on
  // its own, so a missing title costs nothing.
  title?: string
  question: string
  help?: string
  options: AskOption[]
  allowOther: boolean
}

// A ROUND of questions, asked in one call and answered in one go.
//
// One call used to carry one question, which made every answer a server round
// trip that resumed the paused session. That is why the card had no Back: by
// the time question 2 was drawn, question 1's answer was already inside a
// remote session nothing here can rewind. A round makes stepping local, so
// Back, Next and revisiting an answered step cost nothing and send nothing,
// and it drops two model turns of waiting out of a three-question setup.
//
// The agent still adapts, between rounds rather than between questions: it can
// ask another round once it has read these answers.
export type AskSpec = {
  questions: AskQuestion[]
  // Where this round sits in the interview as a whole: `step` is the number of
  // its FIRST question (1-based) and `total` the questions planned across every
  // round. Both feed the counter only, so a follow-up round reads "4 of 4"
  // rather than starting over at one.
  step?: number
  total?: number
}

function normalizeOptions(raw: unknown): AskOption[] {
  return (Array.isArray(raw) ? raw : [])
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
}

function normalizeQuestion(raw: unknown): AskQuestion | null {
  const obj = (raw ?? {}) as Record<string, unknown>
  const question = String(obj.question ?? '').trim()
  if (!question) return null
  const title = String(obj.title ?? '').trim()
  return {
    title: title ? title.slice(0, 40) : undefined,
    question,
    help: obj.help ? String(obj.help).trim() : undefined,
    options: normalizeOptions(obj.options),
    allowOther: obj.allow_other !== false,
  }
}

// How many questions one call may carry. A round longer than this is a form,
// and a form is the thing the interview exists instead of.
export const MAX_ASK_QUESTIONS = 4

// Normalize an ask_user tool call into what the interview card renders.
// Tolerant of loose model output (missing labels, non-array options), and of
// the single-question shape this tool used before rounds existed, because a
// thread can be holding one of those calls when the new code deploys.
export function summarizeAsk(input: Record<string, unknown>): AskSpec {
  const batch = Array.isArray(input.questions)
    ? input.questions.map(normalizeQuestion).filter((q): q is AskQuestion => q !== null)
    : []
  const legacy = batch.length === 0 ? normalizeQuestion(input) : null

  const questions = (legacy ? [legacy] : batch).slice(0, MAX_ASK_QUESTIONS)

  return {
    // Never empty: a call too malformed to read still has to draw a card the
    // person can answer, or the turn is stranded with nothing on screen.
    questions: questions.length
      ? questions
      : [{ question: 'Which fits best?', options: [], allowOther: true }],
    step: typeof input.step === 'number' ? input.step : undefined,
    total: typeof input.total === 'number' ? input.total : undefined,
  }
}

// The answers to a round, pulled off a stored message's payload so the thread
// can draw them as the card they were given in. Lives here rather than beside
// the card because the chat page reads it on the SERVER, and a function
// exported from a 'use client' module cannot be called there.
//
// Tolerant: this is jsonb written by whatever version of the app was running
// at the time.
export function parseInterview(raw: unknown): { q: string; a: string }[] | null {
  if (!Array.isArray(raw)) return null
  const rows = raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>
      const q = String(o.q ?? '').trim()
      const a = String(o.a ?? '').trim()
      return q && a ? { q, a } : null
    })
    .filter((x): x is { q: string; a: string } => x !== null)
  return rows.length ? rows : null
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
  // The Drive write tools require the human-readable names in their input
  // (alongside the ids) exactly so these cards can say what is about to
  // happen in words the user recognizes, never a file id.
  if (name === 'drive_create_folder') {
    const folder = String(input.name ?? 'a folder')
    const parent = String(input.parent_name ?? '')
    return {
      title: `Create a Drive folder called "${folder}"`,
      detail: parent ? `Inside "${parent}".` : 'In your Google Drive.',
    }
  }
  if (name === 'drive_move_file') {
    const file = String(input.file_name ?? 'a file')
    const folder = String(input.folder_name ?? 'another folder')
    return {
      title: `Move "${file}" into "${folder}"`,
      detail: 'In your Google Drive.',
    }
  }
  if (name === 'drive_rename_file') {
    const file = String(input.file_name ?? 'a file')
    const newName = String(input.new_name ?? '')
    return {
      title: `Rename "${file}" to "${newName}"`,
      detail: 'In your Google Drive.',
    }
  }
  return { title: `Run ${name.replace(/_/g, ' ')}`, detail: '' }
}

// CustomToolParams for the session's agent-with-overrides tools array. Typed
// loosely here; cast to the SDK type at the call site.
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'custom' as const,
    name: 'search_web',
    description:
      "Search the public web and get back a short list of pages: title, link and a snippet of each. Use it whenever the answer depends on something current, specific, or outside what you already know. It returns snippets only, never full pages, so read the ones that look useful with your web fetch tool before answering from them. Cite the pages you used by name and link. Set `recency` when the question is about something recent, such as news or a release: without it you get the whole web including pages from years ago, which is what you want for a review or a comparison and wrong for anything happening now.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'What to search for, phrased as you would type it into a search engine.',
        },
        recency: {
          type: 'string',
          enum: ['week', 'month', 'year'],
          description:
            'Restrict results to pages from the last week, month or year. Leave it out for anything not time-sensitive.',
        },
      },
      required: ['query'],
    },
  },
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
    name: 'drive_create_folder',
    description:
      "Create a new folder in the user's Google Drive. Use when organizing files into a structure the user asked for. Pass `parent_name` (and `parent_id`) when creating it inside another folder; omit both for the top level. The user approves the call before the folder is created.",
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name for the new folder.' },
        parent_id: {
          type: 'string',
          description: 'Drive id of the folder to create it inside (optional).',
        },
        parent_name: {
          type: 'string',
          description:
            'Human name of that parent folder, shown to the user on the approval card (required when parent_id is set).',
        },
      },
      required: ['name'],
    },
  },
  {
    type: 'custom' as const,
    name: 'drive_move_file',
    description:
      "Move one Google Drive file or folder into a folder. Get ids from drive_list_files or drive_create_folder. ALWAYS pass `file_name` and `folder_name` (the human names) so the user can read what will happen on the approval card. The user approves each move before it happens.",
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: { type: 'string', description: 'Drive id of the file to move.' },
        file_name: {
          type: 'string',
          description: 'Human name of that file, shown on the approval card.',
        },
        folder_id: {
          type: 'string',
          description: 'Drive id of the destination folder.',
        },
        folder_name: {
          type: 'string',
          description: 'Human name of that folder, shown on the approval card.',
        },
      },
      required: ['file_id', 'file_name', 'folder_id', 'folder_name'],
    },
  },
  {
    type: 'custom' as const,
    name: 'drive_rename_file',
    description:
      "Rename one Google Drive file or folder. ALWAYS pass `file_name` (the current human name) so the user can read what will happen on the approval card. The user approves each rename before it happens.",
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: { type: 'string', description: 'Drive id of the file to rename.' },
        file_name: {
          type: 'string',
          description: 'Current name of that file, shown on the approval card.',
        },
        new_name: { type: 'string', description: 'The new name.' },
      },
      required: ['file_id', 'file_name', 'new_name'],
    },
  },
  {
    type: 'custom' as const,
    name: 'create_document',
    description:
      "Produce a document and hand it back to the user as a downloadable Markdown file shown in the chat (a preview plus a Download button). Use this whenever the user asks you to write, generate, compile, put together, or 'give me' a document, report, summary, or file, instead of only pasting it into the chat. Put the FULL document in `content` as Markdown and a short human `title`. This does not send or save anything outside the chat; it only gives the user a file to download, so no approval is needed.",
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Short human title for the document.',
        },
        content: {
          type: 'string',
          description: 'The full document body, as Markdown.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    type: 'custom' as const,
    name: 'ask_user',
    description:
      "Ask the user a ROUND of 1 to 4 related questions in one call and pause for their answers. Use this to run the first-run setup interview (understand what they want and how they want it) and any time a choice is bounded. The user gets one card that steps through the round, so they can move back and change an answer before sending, and every answer comes back to you together. Ask everything you can already plan for in a single round rather than one question per call. Give each question 3 to 5 concrete `options`, each with a short `label` and a one-line `description` of what it means. Set `step` to the number of the round's FIRST question and `total` to how many questions the whole interview will have, so a second round continues the count instead of restarting it. The user can also write their own answer unless you set allow_other to false. Once you have the answers, ask another round only if something they said opened a question you could not have planned; otherwise stop and confirm what you understood.",
    input_schema: {
      type: 'object' as const,
      properties: {
        questions: {
          type: 'array',
          description:
            'The round of questions, in the order they should be asked. 1 to 4; three is usually right for setup.',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description:
                  "Two or three words naming what this question is about, shown in the card header (e.g. 'The job', 'What starts me off').",
              },
              question: { type: 'string', description: 'The question itself.' },
              help: {
                type: 'string',
                description: 'One line of supporting context shown under the question.',
              },
              options: {
                type: 'array',
                description: 'The choices to offer, 3 to 5 is ideal.',
                items: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'string',
                      description: 'Short stable value (falls back to label).',
                    },
                    label: {
                      type: 'string',
                      description: 'Bold choice label the user sees.',
                    },
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
                description: 'Let them write their own answer (default true).',
              },
            },
            required: ['question'],
          },
        },
        step: {
          type: 'number',
          description:
            "The number of this round's first question within the whole interview, 1-based.",
        },
        total: {
          type: 'number',
          description: 'Total questions planned across the whole interview.',
        },
      },
      required: ['questions'],
    },
  },
  {
    type: 'custom' as const,
    name: PROPOSE_SETUP_TOOL,
    description:
      "End the first-run setup interview. Call this INSTEAD of replying with a plain confirmation sentence, once you understand what the user wants. Pass the `name` the agent should be called and the `instructions` describing its job, both written in the user's own terms and in plain language. The user sees them, can edit them, and taps to confirm before you begin any work. If they reply asking for something different, revise and call this again with the new wording. Setup only: never call this once setup is complete.",
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description:
            'Short, human name for the agent, 2 to 4 words in Title Case.',
        },
        instructions: {
          type: 'string',
          description:
            "One short paragraph, written to the user, saying what this agent will do for them and how. Plain sentences, no headings or lists.",
        },
        how_often: {
          type: 'string',
          description:
            "If they said they want this on a regular schedule, their own short words for it, like 'Once a week' or 'Every weekday morning'. Leave this out if they said they would rather just ask you, or if the job is a one-off.",
        },
      },
      required: ['name', 'instructions'],
    },
  },
  {
    type: 'custom' as const,
    name: SET_ROUTINE_TOOL,
    description:
      "Set up a routine: standing work you will do for the user on a schedule, like 'check my inbox every weekday at 8am'. Call this whenever the user asks for anything recurring or scheduled. The user sees a card with the schedule and the real run dates and must confirm before the routine exists; nothing is created or run until they do. All times are in the user's own timezone and the server supplies it, so never ask about timezones. Write `instruction` as a complete brief to your future self for each run: what to read, what to produce, and what not to do. If the user asks to change or cancel an existing routine, tell them to open Routines in the sidebar instead.",
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Short human name, e.g. "Morning inbox triage".',
        },
        instruction: {
          type: 'string',
          description:
            'The standing brief you will receive on every run. Complete and self-contained; the chat history will not be there.',
        },
        freq: {
          type: 'string',
          enum: ['hour', 'day', 'week', 'month'],
          description: 'The schedule unit. Hourly is the floor.',
        },
        interval: {
          type: 'integer',
          description:
            'Every N units: 1 for every day, 2 with freq week for every 2 weeks, 10 with freq day for every 10 days.',
        },
        byday: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
            ],
          },
          description:
            'For freq week: which days it runs. For freq day: limit to these weekdays (monday to friday means "every weekday").',
        },
        month_day: {
          type: 'string',
          description:
            'For freq month: the day of the month, 1 to 31, or "last" for the last day. Days 29 to 31 skip months that lack them.',
        },
        hour: {
          type: 'integer',
          description: "Hour of the day, 0 to 23, in the user's local time.",
        },
        minute: {
          type: 'integer',
          description: 'Minute, 0 to 59. Default 0.',
        },
      },
      required: ['name', 'instruction', 'freq', 'interval', 'hour'],
    },
  },
]
