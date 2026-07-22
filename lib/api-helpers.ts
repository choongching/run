import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type AdminCheck =
  | { error: NextResponse; supabase: null; userId: null }
  | { error: null; supabase: SupabaseServerClient; userId: string }

// Route handlers must enforce authorization themselves, never rely on the
// dashboard shell having done it.
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: null,
      userId: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      supabase: null,
      userId: null,
    }
  }

  return { error: null, supabase, userId: user.id }
}
