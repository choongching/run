import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'

// One-time setup: create the shared Managed Agents runtime Environment that
// every mission session runs in. Idempotent — if an environment is already
// stored, return it instead of creating a duplicate.

export async function POST() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: settings } = await supabase
    .from('company_settings')
    .select('id, anthropic_environment_id')
    .not('id', 'is', null)
    .limit(1)
    .single()

  if (!settings) {
    return NextResponse.json(
      { error: 'Company settings not found' },
      { status: 500 }
    )
  }

  if (settings.anthropic_environment_id) {
    return NextResponse.json({
      environment_id: settings.anthropic_environment_id,
      created: false,
    })
  }

  try {
    const anthropic = getAnthropicClient()
    const environment = await anthropic.beta.environments.create({
      name: 'Run-missions',
      description: 'Shared runtime for Run mission sessions',
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
      betas: [MANAGED_AGENTS_BETA],
    })

    const { error: dbError } = await supabase
      .from('company_settings')
      .update({ anthropic_environment_id: environment.id })
      .eq('id', settings.id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
    return NextResponse.json(
      { environment_id: environment.id, created: true },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Could not create the runtime environment: ${message}` },
      { status: 502 }
    )
  }
}
