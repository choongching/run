import { sendMessage, webhookAuthorized } from '@/lib/telegram/client'
import { verifyPairingToken } from '@/lib/telegram/pairing'
import { createServiceClient } from '@/lib/supabase/service'

// Telegram calls here. This is the SECOND route in the app with no user behind
// it, after /api/routines/tick, and it authenticates the same way: a shared
// secret Telegram echoes in a header, compared in constant time, failing
// closed when the secret is not configured.
//
// SECURITY BOUNDARY, not a scope cut: this bot is a mailbox, not a
// conversation. It understands /start and /stop. Everything else gets one
// canned sentence and is discarded, and NOTHING a person types here is ever
// passed to a model or an agent. Relaying it would open an inbound path from
// an unauthenticated channel into a system that reads someone's email and
// files, which is precisely the surface this product exists not to have.
//
// Telegram retries any non-2xx, so this route answers 200 to everything it has
// authenticated. A failure we cannot fix by retrying (an expired token, an
// unknown command) is a conversation to have with the person, not a status
// code to argue with a queue about.

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string }
    text?: string
  }
}

const CONNECTED = 'Connected. Your routine reports will arrive here.'
const STOPPED =
  'Stopped. Your reports stay in the app, and you can turn this back on there any time.'
const EXPIRED =
  'That link has expired. Open Run and turn on Telegram delivery again to get a fresh one.'
// A bare /start carries no token, which is what happens when someone finds the
// bot by searching rather than by tapping a link. Telling them a link expired
// is a lie about a link they never had, and it sent two people hunting a clock
// problem on 2026-08-20. Say what is actually true instead.
const NO_TOKEN =
  'To get your routine reports here, open Run, turn on Telegram delivery for a routine, and tap the button. That sends me the link I need.'
const UNKNOWN =
  'I only deliver routine reports. Everything else happens in the app.'
const MOVED =
  'Your routine reports have been connected to a different Telegram account, so they will stop arriving here. If that was not you, open Run and connect this account again.'

export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return Response.json({ error: 'Not configured.' }, { status: 500 })
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return Response.json({ ok: true })
  }

  const chatId = update.message?.chat?.id
  const text = (update.message?.text ?? '').trim()
  if (chatId === undefined || chatId === null) return Response.json({ ok: true })
  const chat = String(chatId)

  // /start carries the pairing token as its payload.
  if (text.startsWith('/start')) {
    const token = text.slice('/start'.length).trim()
    if (!token) {
      await sendMessage(chat, NO_TOKEN)
      return Response.json({ ok: true })
    }

    const check = verifyPairingToken(token)
    if (!check.ok) {
      // The person sees one message for every failure, on purpose: a forged
      // token and an expired one are different to us and identical to them,
      // because the next step is the same either way. Saying "bad signature"
      // would only ever inform an attacker.
      //
      // WE need the difference though. On 2026-08-20 a bad signature showed as
      // "expired" and cost two rounds of debugging a clock that was fine, so
      // the reason goes to the log where only we can read it.
      console.warn('[telegram] pairing rejected', { reason: check.reason })
      await sendMessage(chat, EXPIRED)
      return Response.json({ ok: true })
    }

    // Read the existing pairing before overwriting it. Pressing Start twice
    // from the same chat is ordinary and silent, but a pairing that MOVES to a
    // different chat is worth a word to the chat losing it.
    //
    // The narrow case this closes: anyone holding a live pairing token can
    // point an account's reports at their own Telegram, and the upsert below
    // would do it silently, leaving the rightful owner wondering why the
    // reports stopped. Telling the old chat turns a silent redirect into one
    // the person can see and undo. It is also just good manners when someone
    // legitimately switches phones.
    const { data: existing } = await supabase
      .from('user_telegram')
      .select('chat_id')
      .eq('user_id', check.userId)
      .maybeSingle()

    await supabase
      .from('user_telegram')
      .upsert(
        { user_id: check.userId, chat_id: chat, paired_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (existing?.chat_id && existing.chat_id !== chat) {
      await sendMessage(existing.chat_id, MOVED)
    }
    await sendMessage(chat, CONNECTED)
    return Response.json({ ok: true })
  }

  // /stop is Telegram's convention and does the same as blocking the bot,
  // except the person stays able to talk to it. Scoped by chat id, so it can
  // only ever unpair the chat the message came from.
  if (text.startsWith('/stop')) {
    await supabase.from('user_telegram').delete().eq('chat_id', chat)

    await sendMessage(chat, STOPPED)
    return Response.json({ ok: true })
  }

  await sendMessage(chat, UNKNOWN)
  return Response.json({ ok: true })
}
