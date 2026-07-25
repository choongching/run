import { requireUser } from '@/lib/api-helpers'
import type { Mission, MissionEvent } from '@/lib/types/database'

// Live feed for the Activity timeline: replays the mission's persisted
// events, then tails the table until the run reaches a terminal state.
// The database is the bus (the run route writes rows as session events
// arrive), so a reload never loses history and no second connection to the
// Anthropic stream is ever opened.
export const maxDuration = 300

const TERMINAL: Mission['status'][] = [
  'completed',
  'stopped',
  'failed',
  'needs_attention',
]
const POLL_MS = 1500
// After the mission goes terminal, keep tailing briefly so the final marker
// rows (run.completed / run.failed) written around the status flip arrive.
const DRAIN_AFTER_TERMINAL_MS = 4000

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireUser()
  if (error) return error
  const { id } = await params

  // RLS answers visibility: owners see their missions, admins see all.
  const { data: mission } = await supabase
    .from('missions')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()
  if (!mission) {
    return Response.json({ error: 'Mission not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const after = Number(url.searchParams.get('after') ?? 0)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastId = Number.isFinite(after) ? after : 0
      let closed = false
      let terminalSince: number | null = null

      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed by the runtime.
        }
      }
      request.signal.addEventListener('abort', close)

      const send = (payload: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      while (!closed) {
        const { data: rows } = await supabase
          .from('mission_events')
          .select('id, event_type, payload, created_at')
          .eq('mission_id', id)
          .gt('id', lastId)
          .order('id', { ascending: true })
          .limit(500)

        for (const row of (rows ?? []) as Omit<MissionEvent, 'mission_id'>[]) {
          send({ kind: 'event', event: row })
          lastId = row.id
        }

        const { data: current } = await supabase
          .from('missions')
          .select('status')
          .eq('id', id)
          .maybeSingle()

        if (current && TERMINAL.includes(current.status)) {
          terminalSince ??= Date.now()
          if (Date.now() - terminalSince > DRAIN_AFTER_TERMINAL_MS) {
            send({ kind: 'done', status: current.status, lastId })
            close()
            break
          }
        } else {
          terminalSince = null
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
