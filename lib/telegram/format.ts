import { stripCiteTags } from '@/lib/tools/definitions'
import { MAX_MESSAGE_CHARS } from './client'

// Turning a routine's report into a Telegram message.
//
// The house rule for these messages is the same one the email spike landed on:
// small and lightweight. No decoration, no images, no buttons. The report, one
// link, and nothing competing with them. A notification that arrives on a
// phone is read in a glance or not at all.

// The app's public origin, for the one link back into the thread.
// NEXT_PUBLIC_APP_URL is the name this project already uses; do not invent a
// second one, or the link silently falls back to the hardcoded default on any
// environment that sets only the real variable.
function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://tryrun.today'
  )
}

// Telegram's HTML mode understands five tags and nothing else, so anything
// looking like markup in the report body has to be neutralised or it breaks
// the whole message. This escapes the three characters that matter, which is
// also the injection floor for the message: a report that contains
// "<b>" arrives showing those characters rather than styling itself.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// The exact line an agent ends with when a run found nothing worth reporting.
// Checked against the closing block, not the whole reply, for the same reason
// the run headline is: a run that searched writes a lead-in first.
export const NOTHING_NEW = 'NOTHING NEW'

export function isNothingNew(closingBlock: string | null | undefined): boolean {
  if (!closingBlock) return false
  return closingBlock.trim().toUpperCase().endsWith(NOTHING_NEW)
}

// Strip the sentinel before a human sees it. It is a signal for us, not a line
// of the report, and a run that says something AND ends with the marker should
// not deliver the marker.
function withoutSentinel(text: string): string {
  return text.replace(/\s*NOTHING NEW\s*$/i, '').trimEnd()
}

export type ReportMessage = { text: string; truncated: boolean }

export function formatReport(args: {
  headline: string
  report: string
  agentId: string
  quietRuns?: number
}): ReportMessage {
  const link = `${appOrigin()}/chat/${args.agentId}`
  const headline = escapeHtml(stripCiteTags(args.headline).trim())
  const body = escapeHtml(withoutSentinel(stripCiteTags(args.report).trim()))

  // The trust hedge for quiet runs. Silence between reports is the design, but
  // silence with no explanation reads as breakage, so the next real report
  // says how many times the agent looked and found nothing. Costs no extra
  // messages, which is the whole point.
  const quiet =
    args.quietRuns && args.quietRuns > 0
      ? `\n<i>Since the last report, ${args.quietRuns} ${
          args.quietRuns === 1 ? 'run' : 'runs'
        } found nothing new.</i>\n`
      : ''

  const footer = `\n<a href="${link}">Open in Run</a>`
  const full = `<b>${headline}</b>\n\n${body}\n${quiet}${footer}`
  if (full.length <= MAX_MESSAGE_CHARS) return { text: full, truncated: false }

  // Measured as near-impossible (longest real report 3,103 characters), but a
  // send over the cap fails outright, so the fallback sends what always fits:
  // the headline and the link. Deliberately NOT a cut-off body, because half a
  // report is worse than an honest pointer to the whole one.
  return {
    text: `<b>${headline}</b>\n\nThis report is too long to send here.\n${footer}`,
    truncated: true,
  }
}

export function formatPausedNotice(args: {
  routineName: string
  notice: string
  agentId: string
}): string {
  const link = `${appOrigin()}/chat/${args.agentId}`
  return [
    `<b>${escapeHtml(args.routineName)} has paused itself</b>`,
    '',
    escapeHtml(args.notice),
    '',
    `<a href="${link}">Open in Run</a>`,
  ].join('\n')
}
