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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
