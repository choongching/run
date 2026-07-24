import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'

export async function PATCH(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const body = await request.json().catch(() => null)
  const displayName =
    typeof body?.display_name === 'string' ? body.display_name.trim() : ''
  if (!displayName || displayName.length > 80) {
    return NextResponse.json(
      { error: 'display_name is required (max 80 characters)' },
      { status: 400 }
    )
  }

  const { data, error: dbError } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select('id, display_name')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ profile: data })
}
