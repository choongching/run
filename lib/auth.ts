import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database'

// Who is asking, established WITHOUT a round trip.
//
// getClaims verifies the access token against the project's published ES256
// signing key using WebCrypto, so it is local work. getUser() asks the Supabase
// auth server the same question over the network, and measured against this
// project that costs 120ms to 650ms. It sat in front of every dashboard page,
// ahead of every query, so it was the single largest thing between a click and
// a screen.
//
// The proxy already made exactly this trade (see lib/supabase/proxy.ts) and
// this finishes the job. The security property is unchanged for the thing we
// actually rely on: the signature is verified, so the id cannot be forged, and
// an expired token is rejected. What it no longer catches is a user deleted or
// banned mid-token, which the next refresh picks up within the token's lifetime.
// Every read is still scoped by RLS on the server regardless of what this says.
//
// Memoised for the length of one request, so the layout and the page it wraps
// resolve the same identity once.
export const getUserIdentity = cache(async function getUserIdentity(): Promise<{
  userId: string
  email: string
}> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) redirect('/login')

  return { userId: claims.sub, email: claims.email ?? '' }
})

// Identity plus the profile row. Kept as one call because most pages want the
// display name and avatar, but callers that only need to know WHO should use
// getUserIdentity and skip the query entirely.
//
// Memoised for the same reason as above: every dashboard page calls this, and
// so does the layout wrapping it, so a single load used to pay for two
// identical profiles queries on top of two auth round trips.
//
// Safe to cache because nothing in a request changes who is asking. The one
// thing that could go stale is the profile itself, and the only write to it
// goes through the profile API route via requireUser rather than through here.
export const getUserProfile = cache(async function getUserProfile(): Promise<{
  userId: string
  email: string
  profile: Profile | null
}> {
  const [{ userId, email }, supabase] = await Promise.all([
    getUserIdentity(),
    createClient(),
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { userId, email, profile }
})
