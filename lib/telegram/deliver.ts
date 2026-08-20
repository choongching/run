import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'
import { isTelegramConfigured, sendMessage } from './client'
import { formatPausedNotice, formatReport } from './format'

// Delivering a routine's report to Telegram.
//
// One module so the executor stays about running routines. Everything here is
// best effort by design: the report is already saved in the thread before any
// of this runs, so a failed send costs the notification and nothing else, and
// the product degrades to exactly what it was yesterday.
//
// Server only. Takes the service-role client, because a scheduled run has no
// user session and `user_telegram` deliberately has no write policy.

export type DeliveryOutcome =
  // Sent, and the quiet-run counter should be reset.
  | 'sent'
  // Nothing to do: delivery is off for this routine, or Telegram is not
  // configured on this deployment.
  | 'off'
  // They want it but have not paired, or their chat is gone. Not an error:
  // the app shows this state, and the report is in the thread.
  | 'unpaired'
  // Telegram was reachable and refused, or was not reachable. Logged, ignored.
  | 'failed'

async function chatIdFor(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_telegram')
    .select('chat_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.chat_id ?? null
}

// A chat id that comes back 403 (blocked) or 400 (unusable) is dead. Clearing
// it is what makes Telegram's own block button the unsubscribe: no route of
// ours, no opt-out link, no confirmation page. The person pressed block, and
// the next send is how we find out and stop.
async function forget(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.from('user_telegram').delete().eq('user_id', userId)
}

export async function deliverReport(args: {
  supabase: SupabaseClient<Database>
  userId: string
  agentId: string
  deliverTelegram: boolean
  headline: string
  report: string
  quietRuns: number
}): Promise<DeliveryOutcome> {
  if (!args.deliverTelegram || !isTelegramConfigured()) return 'off'

  const chatId = await chatIdFor(args.supabase, args.userId)
  if (!chatId) return 'unpaired'

  const { text } = formatReport({
    headline: args.headline,
    report: args.report,
    agentId: args.agentId,
    quietRuns: args.quietRuns,
  })

  const result = await sendMessage(chatId, text)
  if (result.ok) return 'sent'
  if (result.kind === 'gone') {
    await forget(args.supabase, args.userId)
    return 'unpaired'
  }
  console.error('[telegram] report send failed', {
    kind: result.kind,
    status: 'status' in result ? result.status : undefined,
  })
  return 'failed'
}

// The one message that goes out whatever the run found. A routine that has
// paused itself with a silent owner is a dead routine nobody chose to kill,
// so this ignores the nothing-new rule entirely.
export async function deliverPausedNotice(args: {
  supabase: SupabaseClient<Database>
  userId: string
  agentId: string
  deliverTelegram: boolean
  routineName: string
  notice: string
}): Promise<DeliveryOutcome> {
  if (!args.deliverTelegram || !isTelegramConfigured()) return 'off'

  const chatId = await chatIdFor(args.supabase, args.userId)
  if (!chatId) return 'unpaired'

  const result = await sendMessage(
    chatId,
    formatPausedNotice({
      routineName: args.routineName,
      notice: args.notice,
      agentId: args.agentId,
    })
  )
  if (result.ok) return 'sent'
  if (result.kind === 'gone') {
    await forget(args.supabase, args.userId)
    return 'unpaired'
  }
  console.error('[telegram] paused notice send failed', { kind: result.kind })
  return 'failed'
}
