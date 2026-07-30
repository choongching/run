import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

// Where the email link lands. Verifies the token, which signs the person in,
// then forwards them to set a new password.
//
// It accepts BOTH link shapes Supabase sends, because which one arrives
// depends on the project's email template and auth flow settings, and coding
// for one while the dashboard is set to the other is the classic way this
// flow breaks: a PKCE `?code=` is exchanged for a session, a
// `?token_hash=&type=` is verified as an OTP. Either way the failure path is
// the same plain sentence on the login page, never a raw error.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/reset-password'
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = (searchParams.get('type') ?? 'recovery') as EmailOtpType

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}/login?error=` +
      encodeURIComponent('That link has expired or was already used. Request a new one.')
  )
}
