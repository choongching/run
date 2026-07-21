'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/missions')
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || null } },
  })
  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }
  if (!data.session) {
    redirect(
      '/login?message=' +
        encodeURIComponent('Check your email to confirm your account, then sign in.')
    )
  }
  redirect('/missions')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
