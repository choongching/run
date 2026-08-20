import { requireUser } from '@/lib/api-helpers'
import { isTelegramConfigured } from '@/lib/telegram/client'
import { mintPairingToken, pairingLink } from '@/lib/telegram/pairing'

// Pairing, from the app's side. The other side is the webhook, which is where
// the chat id actually arrives.
//
// GET answers "am I connected?", which the sheet polls while someone is off in
// Telegram pressing Start. POST mints the link that sends them there.
//
// Both are user-scoped through requireUser, unlike the webhook: this is the
// one end of pairing that a signed-in person drives.

export async function GET() {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  // Reads through the caller's own client, so the row is theirs by RLS rather
  // than by us remembering to filter. user_telegram grants select on your own
  // row and nothing else.
  const { data } = await supabase
    .from('user_telegram')
    .select('paired_at')
    .eq('user_id', userId)
    .maybeSingle()

  return Response.json({
    paired: Boolean(data),
    pairedAt: data?.paired_at ?? null,
    available: isTelegramConfigured(),
  })
}

export async function POST() {
  const { error, userId } = await requireUser()
  if (error) return error

  if (!isTelegramConfigured()) {
    // A deployment without the bot configured should not hand out links that
    // lead to a bot nobody is listening on.
    return Response.json(
      { error: 'Telegram delivery is not available here.' },
      { status: 503 }
    )
  }

  try {
    return Response.json({ link: pairingLink(mintPairingToken(userId)) })
  } catch {
    // pairingLink throws when the bot username is unset, which is a
    // deployment mistake rather than anything the person did.
    return Response.json(
      { error: 'Telegram delivery is not configured.' },
      { status: 503 }
    )
  }
}

// Unpair from the app. The chat id has no write policy, so this needs the
// service role: the whole point of that table is that a person cannot set
// their own chat id, and the cost is that they cannot clear it either without
// going through us.
export async function DELETE() {
  const { error, userId } = await requireUser()
  if (error) return error

  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  if (!service) {
    return Response.json({ error: 'Not configured.' }, { status: 500 })
  }

  await service.from('user_telegram').delete().eq('user_id', userId)
  return Response.json({ paired: false })
}
