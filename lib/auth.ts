import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database'

export async function getUserProfile(): Promise<{
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
}

export async function requireAdminPage() {
  const result = await getUserProfile()
  if (result.profile?.role !== 'admin') redirect('/missions')
  return result
}
