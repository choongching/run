'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  CalendarDays,
  Copy,
  ExternalLink,
  Globe,
  LoaderCircle,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  MISSION_STATUS_DOT,
  MISSION_STATUS_LABEL,
  OUTPUT_TYPE_LABEL,
  type MissionWithAgent,
} from '@/components/missions/mission-status'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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

export function MissionDetail({ mission }: { mission: MissionWithAgent }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const status = running ? 'in_progress' : mission.status

  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/missions/${mission.id}/run`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error ?? `Run failed (${res.status})`)
      }
      toast.success(`"${mission.title}" is done.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The mission run failed.')
    } finally {
      setRunning(false)
      router.refresh()
    }
  }

  function copySessionId() {
    if (!mission.anthropic_run_id) return
    navigator.clipboard.writeText(mission.anthropic_run_id)
    toast.success('Run reference copied.')
  }

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
        {status === 'needs_attention' && (
          <Button size="sm" onClick={run} disabled={running}>
            <Play data-icon="inline-start" />
            Run mission
          </Button>
        )}
        {status === 'in_progress' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin stroke-[1.75]" />
            Running
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>
            What {mission.agents?.name ?? 'the agent'} was asked to do.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{mission.brief}</p>
        </CardContent>
      </Card>

      {mission.status === 'completed' && (
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
