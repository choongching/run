import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims verifies the token against the project's published signing key
  // using WebCrypto, so this is local work rather than a round trip to the auth
  // server on every single request. getUser() always makes that call, and this
  // runs ahead of every page render, so it was pure latency in front of the
  // whole app.
  //
  // The security property is the same: the signature is verified, so a forged
  // or tampered token fails here exactly as it did before. It is not the same
  // as trusting the cookie unverified, which would be a real downgrade.
  //
  // This project publishes an ES256 key, which is what makes the verification
  // local. On a project still signing with a shared secret the method falls
  // back to calling the auth server, so this would be correct but no faster.
  //
  // Session refresh, the other half of what this proxy exists to do, is
  // preserved: getClaims refreshes an access token that is about to expire
  // before validating it.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ?? null
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isDashboardRoute = !isAuthRoute && !pathname.startsWith('/api') && pathname !== '/'

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
