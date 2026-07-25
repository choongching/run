'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  CalendarDays,
  CircleAlert,
  Copy,
  ExternalLink,
  Globe,
  LoaderCircle,
  Play,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MissionStatus } from '@/lib/types/database'
import {
  MISSION_STATUS_DOT,
  MISSION_STATUS_LABEL,
  OUTPUT_TYPE_LABEL,
  type MissionWithAgent,
} from '@/components/runs/mission-status'
import { ActivityTimeline } from '@/components/runs/activity-timeline'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export function MissionStatusChip({
  status,
}: {
  status: MissionWithAgent['status']
}) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', MISSION_STATUS_DOT[status])}
      />
      {MISSION_STATUS_LABEL[status]}
    </span>
  )
}

const RUNNABLE: MissionStatus[] = ['needs_attention', 'stopped', 'failed']

export function MissionDetail({ mission }: { mission: MissionWithAgent }) {
  const router = useRouter()
  const [status, setStatus] = useState<MissionStatus>(mission.status)
  const [note, setNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const agentName = mission.agents?.name ?? 'the agent'

  const onStatusChange = useCallback(
    (next: MissionStatus) => {
      setStatus(next)
      // Terminal states carry fresh server data (output, error message).
      // The second refresh covers the dev-observed race where the first one
      // lands before the router picks up the completed row.
      if (next !== 'in_progress') {
        router.refresh()
        setTimeout(() => router.refresh(), 2000)
      }
    },
    [router]
  )

  // Fire the run and let the Activity feed tell the story; the response
  // only matters if starting failed outright.
  function run() {
    setStatus('in_progress')
    void fetch(`/api/missions/${mission.id}/run`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? `Run failed (${res.status})`)
        }
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : 'The run failed.'
        )
        router.refresh()
      })
  }

  function sendNote() {
    const trimmed = note.trim()
    if (!trimmed) return
    setSendingNote(true)
    setStatus('in_progress')
    void fetch(`/api/missions/${mission.id}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: trimmed }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (res.ok) {
          setNote('')
          return
        }
        if (body?.expired) {
          throw new Error(
            'This run can’t be continued. Run the mission again with your change added to the brief.'
          )
        }
        throw new Error(body?.error ?? `Follow-up failed (${res.status})`)
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : 'The follow-up failed.'
        )
        router.refresh()
      })
      .finally(() => setSendingNote(false))
  }

  function copySessionId() {
    if (!mission.anthropic_run_id) return
    navigator.clipboard.writeText(mission.anthropic_run_id)
    toast.success('Run reference copied.')
  }

  const finished = status === 'completed' || status === 'stopped'

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <MissionStatusChip status={status} />
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
            <Bot className="size-3 shrink-0" />
            {mission.agents?.name ?? 'Unknown agent'}
          </span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" />
            {mission.created_at.slice(0, 10).replaceAll('-', '/')}
          </span>
          {mission.web_search && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
              <Globe className="size-3 shrink-0" />
              Web search
            </span>
          )}
        </div>
        {RUNNABLE.includes(status) && (
          <Button size="sm" onClick={run}>
            <Play data-icon="inline-start" />
            {status === 'needs_attention' ? 'Start run' : 'Run again'}
          </Button>
        )}
        {status === 'in_progress' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin stroke-[1.75]" />
            Running
          </span>
        )}
      </div>

      {status === 'failed' && mission.error_message && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <CircleAlert className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-destructive" />
          <p className="text-sm">
            The run hit a problem: {mission.error_message}. Your brief is
            saved, so you can try again.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>
            What {agentName} was asked to do.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{mission.brief}</p>
        </CardContent>
      </Card>

      <ActivityTimeline
        missionId={mission.id}
        status={status}
        onStatusChange={onStatusChange}
        agentName={agentName}
      />

      {status === 'completed' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1.5">
                <CardTitle>Output</CardTitle>
                <CardDescription>
                  Delivered as {OUTPUT_TYPE_LABEL[mission.output_type]}
                  {mission.completed_at
                    ? ` on ${mission.completed_at.slice(0, 10).replaceAll('-', '/')}.`
                    : '.'}
                </CardDescription>
              </div>
              {mission.output_url && (
                <a
                  href={mission.output_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Open {OUTPUT_TYPE_LABEL[mission.output_type]}
                  <ExternalLink data-icon="inline-end" />
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {mission.output_text ? (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{mission.output_text}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The output lives in the linked file.
              </p>
            )}
            {!mission.output_url && mission.output_type !== 'text' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Saving to Drive didn&apos;t work this time, so the result is
                kept here in full.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {finished && mission.anthropic_run_id && (
        <div className="grid gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ask for a change, like 'make it shorter' or 'add a summary'."
            rows={2}
            disabled={sendingNote}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={sendNote}
              disabled={sendingNote || !note.trim()}
            >
              {sendingNote ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Send data-icon="inline-start" />
              )}
              Send follow-up
            </Button>
          </div>
        </div>
      )}

      {mission.anthropic_run_id && (
        <div className="flex min-h-9 items-center justify-between rounded-lg border border-border px-3">
          <span className="text-sm text-muted-foreground">Run reference</span>
          <span className="flex items-center gap-1">
            <code className="font-mono text-xs">{mission.anthropic_run_id}</code>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copy run reference"
              onClick={copySessionId}
            >
              <Copy />
            </Button>
          </span>
        </div>
      )}
    </div>
  )
}
