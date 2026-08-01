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
  redirect('/')
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  // Required now that both the home screen and every agent's opening line greet
  // people by name. Checked here as well as in the form, because a browser that
  // skips the client validation would otherwise create a nameless account.
  const displayName = String(formData.get('display_name') ?? '').trim().slice(0, 80)
  if (!displayName) {
    redirect(`/register?error=${encodeURIComponent('Tell us your name first.')}`)
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
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
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Sends the reset email. The success message is identical whether the account
// exists or not, so this form cannot be used to probe which emails have
// accounts. One Supabase call, nothing else on the path.
export async function requestReset(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim()
  if (email) {
    const site = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/confirm?next=/reset-password`,
    })
  }
  redirect(
    '/forgot-password?message=' +
      encodeURIComponent(
        'Check your email. The link signs you in so you can set a new password.'
      )
  )
}

// Sets a new password for whoever is signed in: the recovery session from the
// email link, or a normal session changing it from Settings. `from` decides
// where errors and success land so both surfaces reuse this one action.
export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  const from = formData.get('from') === 'settings' ? '/settings' : '/reset-password'

  if (password.length < 8) {
    redirect(`${from}?error=${encodeURIComponent('Use at least 8 characters.')}`)
  }
  if (password !== confirm) {
    redirect(`${from}?error=${encodeURIComponent('Those two do not match.')}`)
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect(`${from}?error=${encodeURIComponent(error.message)}`)
  }
  if (from === '/settings') {
    redirect('/settings?message=' + encodeURIComponent('Password changed.'))
  }
  redirect('/')
}
