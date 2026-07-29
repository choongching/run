import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

// One client per request, shared by everyone who asks.
//
// It reads the same cookies and talks to the same project every time, so
// building a second one produced an identical object at real cost: each client
// keeps its own cache of the project's JWT signing keys, so every extra
// instance meant another fetch of the key set before it could verify anything
// locally. That was invisible while the layout made a single client and passed
// it around, and showed up the moment the sidebar was split into parts that
// each fetch their own data.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — session refresh is handled by proxy.ts
          }
        },
      },
    }
  )
})
