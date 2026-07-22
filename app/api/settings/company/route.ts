import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase
    .from('company_settings')
    .select('company_context, updated_at')
    .limit(1)
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  if (body?.company_context !== null && typeof body?.company_context !== 'string') {
    return NextResponse.json({ error: 'company_context must be a string or null' }, { status: 400 })
  }
  const companyContext =
    typeof body.company_context === 'string' ? body.company_context.trim() || null : null

  // Singleton row: target it without knowing its id.
  const { data, error: dbError } = await supabase
    .from('company_settings')
    .update({ company_context: companyContext })
    .not('id', 'is', null)
    .select('company_context, updated_at')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
