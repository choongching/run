import { timingSafeEqual } from 'node:crypto'

// Talking to Telegram. Server only: the bot token is a platform credential and
// must never reach the browser.
//
// This is a mailbox, not a conversation. The bot delivers reports and answers
// two commands. It never relays anything a person types into an agent, which
// is a security boundary rather than a scope cut: an inbound path from an
// unauthenticated channel into a system that reads someone's email and files
// is exactly the surface this product is built to not have.

const API = 'https://api.telegram.org'

// Telegram's own ceiling for one message. Our reports do not come close
// (measured 2026-08-20: 58 routine reports, longest 3,103 characters), but a
// send that exceeds it fails outright rather than truncating, so the caller
// checks rather than discovering it in production.
export const MAX_MESSAGE_CHARS = 4096

export class TelegramNotConfiguredError extends Error {}

// Thrown rather than returned, because a missing token is a deployment
// mistake and not a user-facing state. Same reasoning as the search
// provider's platform key.
function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new TelegramNotConfiguredError('TELEGRAM_BOT_TOKEN is not set')
  }
  return token
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

// What a send can turn into. Returned rather than thrown, because the caller
// is the routine executor: by the time it sends, the report is already saved
// in the thread, so a failed send is a branch to record and not an error that
// should unwind anything.
//
// `gone` is the interesting one. Telegram answers 403 when someone has blocked
// or stopped the bot, and 400 when the chat id is not usable at all. Both mean
// the same thing to us: this id is dead, stop using it. That is how the block
// button becomes the unsubscribe, with no route of our own to build.
export type SendResult =
  | { ok: true }
  | { ok: false; kind: 'gone' }
  | { ok: false; kind: 'failed'; status?: number }
  | { ok: false; kind: 'too_long' }

export async function sendMessage(
  chatId: string,
  text: string,
  signal?: AbortSignal
): Promise<SendResult> {
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, kind: 'too_long' }

  let res: Response
  try {
    res = await fetch(`${API}/bot${botToken()}/sendMessage`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        // A report often cites its sources. Telegram's own previews would put
        // a stranger's image and headline under our message, which reads as
        // us endorsing whatever ranked first.
        link_preview_options: { is_disabled: true },
      }),
    })
  } catch {
    // Network trouble. No retry queue in v1 on purpose: the report is in the
    // thread, and our volume makes a lost send rare enough that a queue would
    // be more moving parts than the problem deserves.
    return { ok: false, kind: 'failed' }
  }

  if (res.ok) return { ok: true }
  if (res.status === 403 || res.status === 400) return { ok: false, kind: 'gone' }
  return { ok: false, kind: 'failed', status: res.status }
}

// Telegram calls our webhook with this header, set once when the webhook is
// registered. Constant-time compare and fail-closed on a missing secret, the
// same shape as the routines tick, because this is the second route in the app
// with no user behind it.
export function webhookAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return false
  const given = request.headers.get('x-telegram-bot-api-secret-token') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
