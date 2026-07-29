import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type UserCheck =
  | { error: NextResponse; supabase: null; userId: null }
  | { error: null; supabase: SupabaseServerClient; userId: string }

// Any signed-in user. RLS scopes every query to what they can see.
//
// getClaims rather than getUser for the same reason as lib/auth.ts: it verifies
// the token locally against the project's ES256 key instead of asking the auth
// server, which measured 120ms to 650ms. This runs on EVERY route handler,
// including each chat message and each turn of a streaming run, so it was
// latency paid several times over during a single conversation.
export async function requireUser(): Promise<UserCheck> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) {
    return {
      // Reaches a person, so it is written for one. "Unauthorized" tells
      // someone whose session quietly expired nothing about what to do.
      error: NextResponse.json(
        {
          error: 'You have been signed out.',
          sub: 'Sign in again and your conversations will be where you left them.',
        },
        { status: 401 }
      ),
      supabase: null,
      userId: null,
    }
  }
  return { error: null, supabase, userId }
}
