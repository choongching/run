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

// The sentinel must be its OWN LAST LINE, matched whole. An earlier version
// asked whether the text ended with the words, and that silently suppressed a
// real report whose closing sentence happened to be "on the chip front,
// nothing new" (no full stop, so nothing separated the prose from the marker).
//
// That is the failure direction this design exists to avoid: an unneeded
// message is a shrug, a swallowed report is invisible. Whole-line matching
// makes a false positive require the model to write the marker alone on a
// line, which is exactly what it was asked to do and not something prose does
// by accident.
export function isNothingNew(closingBlock: string | null | undefined): boolean {
  if (!closingBlock) return false
  const lines = closingBlock.trim().split('\n')
  const last = lines[lines.length - 1]?.trim().toUpperCase() ?? ''
  return last === NOTHING_NEW
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

  const build = (text: string, linkLabel: string) =>
    `<b>${headline}</b>\n\n${text}\n${quiet}\n<a href="${link}">${linkLabel}</a>`

  const full = build(body, 'Open in Run')
  if (full.length <= MAX_MESSAGE_CHARS) return { text: full, truncated: false }

  // Over the cap, a send fails outright. The first version of this fallback
  // sent only the headline and a "too long" apology, on the theory that half
  // a report is worse than a pointer; the founder hit it live (2026-09-21)
  // and read it as breakage. Now the run prompt asks for a glanceable reply
  // when Telegram delivery is on, and the rare overflow sends every whole
  // paragraph that fits, with the link renamed so it says where the rest is.
  // The full report is already in the thread before delivery starts.
  //
  // Cutting only at paragraph breaks, then at a space, can never split an
  // escaped entity or a tag: the body is fully escaped (no tags) and an
  // entity contains neither newlines nor spaces.
  const paragraphs = body.split('\n\n')
  while (paragraphs.length > 1) {
    paragraphs.pop()
    const candidate = build(paragraphs.join('\n\n'), 'Read the rest in Run')
    if (candidate.length <= MAX_MESSAGE_CHARS)
      return { text: candidate, truncated: true }
  }

  // One paragraph that alone overflows the cap: cut it at the last space
  // that fits. The budget subtracts everything around the body.
  const overhead = build('', 'Read the rest in Run').length
  const room = body.slice(0, MAX_MESSAGE_CHARS - overhead)
  const atSpace = room.slice(0, room.lastIndexOf(' '))
  return {
    text: build(`${atSpace}…`, 'Read the rest in Run'),
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
