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
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
