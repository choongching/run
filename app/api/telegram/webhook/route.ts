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
const UNKNOWN =
  'I only deliver routine reports. Everything else happens in the app.'

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
    const check = token
      ? verifyPairingToken(token)
      : ({ ok: false, reason: 'malformed' } as const)

    if (!check.ok) {
      // Every failure reads the same to the person on purpose. A forged token
      // and an expired one are different to us and identical to them, because
      // the only useful next step is the same either way: go and get a fresh
      // link. Saying "bad signature" would only ever inform an attacker.
      await sendMessage(chat, EXPIRED)
      return Response.json({ ok: true })
    }

    // Upsert, because pressing Start twice is a normal thing a person does,
    // and because someone re-pairing from a new phone must land on their
    // existing row rather than colliding with it.
    await supabase
      .from('user_telegram')
      .upsert(
        { user_id: check.userId, chat_id: chat, paired_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

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
