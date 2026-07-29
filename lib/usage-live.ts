'use client'

import { createClient } from '@/lib/supabase/client'
import type { UsageEvent } from '@/lib/types/database'

// Tell a meter when a run has been recorded.
//
// The row is written by the server after a turn ends, and the meter that shows
// it lives in the shell rather than in the conversation. So the surface that
// needs to know is often not the one that caused it: a second tab, another
// device, or later a scheduled run with nobody watching. Subscribing is what
// keeps the number honest without polling for a change that happens a handful
// of times an hour.
//
// Realtime filters changes through the table's own row-level security, and the
// filter below narrows it further to this person's rows so we are not handed
// deliveries we would only throw away. Returns an unsubscribe function.
export function subscribeToRuns(
  userId: string,
  onRun: (event: UsageEvent) => void
): () => void {
  const supabase = createClient()
  let cancelled = false

  const channel = supabase
    .channel(`usage:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'usage_events',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onRun(payload.new as UsageEvent)
    )
  // The socket carries its own credentials, and they are NOT the ones the rest
  // of the client uses. Left alone it connects as `anon`, which subscribes
  // happily and then receives nothing at all: row-level security evaluates
  // auth.uid() as null, so every row is filtered out on the way to us. That
  // failure is silent and looks exactly like an account with no activity, so
  // hand it the session token before subscribing.
  void supabase.auth.getSession().then(async ({ data }) => {
    if (cancelled) return
    await supabase.realtime.setAuth(data.session?.access_token)
    if (cancelled) return
    // A meter that quietly stops updating looks identical to a meter with
    // nothing to report, so a channel that fails says so.
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('usage realtime channel:', status)
      }
    })
  })

  return () => {
    cancelled = true
    void supabase.removeChannel(channel)
  }
}
