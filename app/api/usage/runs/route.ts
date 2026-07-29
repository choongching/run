import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/api-helpers'
import { listRunHistory } from '@/lib/usage'

// A person's own run history, fetched when they open the usage panel rather
// than on every page load. Most visits never open it, and the sidebar meter
// needs only the count, which the layout already has.
export async function GET(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const before = new URL(request.url).searchParams.get('before') ?? undefined
  const runs = await listRunHistory(supabase, userId, { limit: 50, before })

  return NextResponse.json({ runs })
}
