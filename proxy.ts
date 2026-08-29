import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

// API routes are excluded deliberately. This proxy never gated them: its
// redirect only ever applied to page routes, and /api was explicitly exempt
// from that check. Every route handler authenticates itself through
// requireUser, which is the actual control. So running here bought nothing and
// cost an auth check on every API call, including each message and each poll of
// a streaming chat turn.
export const config = {
  matcher: [
    // robots.txt and sitemap.xml are public by definition; gating them sent
    // every crawler to /login and the sitemap said "/login" in its body.
    // Video joins the image list: the front page's hero clips are fetched
    // signed out, and without this a clip request was answered with a
    // redirect to /login.
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)',
  ],
}
