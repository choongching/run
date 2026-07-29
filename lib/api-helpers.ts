import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type UserCheck =
  | { error: NextResponse; supabase: null; userId: null }
  | { error: null; supabase: SupabaseServerClient; userId: string }

// Any signed-in user. RLS scopes every query to what they can see.
export async function requireUser(): Promise<UserCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
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
  return { error: null, supabase, userId: user.id }
}
