import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database'

// Memoised for the length of one request.
//
// Every dashboard page calls this, and so does the layout wrapping it, so a
// single page load used to pay for two round trips to the Supabase auth server
// plus two identical profiles queries. auth.getUser() is a network call, not a
// local token check, so the duplication was real latency on the critical path
// of every navigation.
//
// Safe to cache because nothing in a request changes who is asking. The one
// thing that could go stale is the profile itself, and the only write to it
// goes through the profile API route via requireUser rather than through here.
export const getUserProfile = cache(async function getUserProfile(): Promise<{
  userId: string
  email: string
  profile: Profile | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { userId: user.id, email: user.email ?? '', profile }
})

