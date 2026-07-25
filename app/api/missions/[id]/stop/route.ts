import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import { getAnthropicClient, MANAGED_AGENTS_BETA } from '@/lib/anthropic/client'
import { recordMissionEvent } from '@/lib/missions/events'

// Stop a running mission. The interrupt is real: the session halts within
// about a second and the interrupted model request bills nothing (verified
// live, docs/capability-matrix-2026-07-25.md). The status flip happens
// first so the run route's drain loop settles the mission as stopped even
// if the interrupt call itself fails.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { id } = await params

  const { data: mission } = await supabase
    .from('missions')
    .select('id, status, anthropic_run_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }

  // Idempotent by design: stopping a stopped run is a silent success, and a
  // run that already finished is a defined no-op with a clear message.
  if (mission.status === 'stopped') {
    return NextResponse.json({ stopped: true })
  }
  if (mission.status !== 'in_progress') {
    return NextResponse.json({
      stopped: false,
      message: 'This run already finished and can’t be stopped now.',
    })
  }

  // Claim the stop: only one caller wins the in_progress -> stopped flip.
  const { data: claimed } = await supabase
    .from('missions')
    .update({ status: 'stopped', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id')
  if (!claimed || claimed.length === 0) {
    // Lost the race: the run completed (or another stop landed) first.
    const { data: current } = await supabase
      .from('missions')
      .select('status')
      .eq('id', id)
      .single()
    return NextResponse.json(
      current?.status === 'stopped'
        ? { stopped: true }
        : {
            stopped: false,
            message: 'This run is almost done and can’t be stopped now.',
          }
    )
  }

  let interruptDelivered = false
  if (mission.anthropic_run_id) {
    try {
      await getAnthropicClient().beta.sessions.events.send(
        mission.anthropic_run_id,
        { events: [{ type: 'user.interrupt' }], betas: [MANAGED_AGENTS_BETA] }
      )
      interruptDelivered = true
    } catch {
      // The drain loop still settles the mission as stopped at turn end;
      // the session just runs to its natural finish server-side.
    }
  }

  await recordMissionEvent(supabase, id, 'run.stopped', {
    interrupt_delivered: interruptDelivered,
  })

  return NextResponse.json({ stopped: true })
}
