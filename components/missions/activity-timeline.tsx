'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  Brain,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileText,
  Globe,
  LoaderCircle,
  OctagonX,
  Play,
  Send,
  Square,
  Terminal,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MissionStatus } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type TimelineRow = {
  id: number
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

// Plain-language labels for tools the agent may use mid-run.
const TOOL_META: Record<string, { icon: typeof Globe; verb: string }> = {
  web_search: { icon: Globe, verb: 'Searched the web' },
  web_fetch: { icon: Globe, verb: 'Read a web page' },
  bash: { icon: Terminal, verb: 'Ran a command' },
  read: { icon: FileText, verb: 'Read a file' },
  write: { icon: FileText, verb: 'Wrote a file' },
  edit: { icon: FileText, verb: 'Edited a file' },
  glob: { icon: FileText, verb: 'Listed files' },
  grep: { icon: FileText, verb: 'Searched files' },
}

function textFromBlocks(payload: Record<string, unknown>): string {
  const content = payload.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        b && typeof b === 'object' && 'text' in b ? String(b.text) : ''
      )
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof payload.thinking === 'string') return payload.thinking
  return ''
}

function toolSummary(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const obj = input as Record<string, unknown>
  const candidate =
    obj.query ?? obj.command ?? obj.path ?? obj.file_path ?? obj.url ?? ''
  return typeof candidate === 'string' ? candidate : ''
}

export function ActivityTimeline({
  missionId,
  status,
  onStatusChange,
  agentName,
}: {
  missionId: string
  status: MissionStatus
  onStatusChange: (status: MissionStatus) => void
  agentName: string
}) {
  const [rows, setRows] = useState<TimelineRow[]>([])
  const [reconnecting, setReconnecting] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [pinnedToEnd, setPinnedToEnd] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef(0)
  // Rows created after mount are live activity, not replayed history; they
  // are what flips a stale Queued/Completed chip to Working.
  const mountedAtRef = useRef(new Date().toISOString())
  const running = status === 'in_progress'

  // Replay-then-live over one fetch-based SSE reader. Reconnects resume from
  // the last seen row id, so history is never re-downloaded or duplicated.
  // `status` is a dependency on purpose: when a run or refine flips the
  // mission back to in_progress after a previous feed ended with its done
  // sentinel, the effect re-runs and opens a fresh feed for the new turn.
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    const LIVE_TYPES = new Set([
      'run.started',
      'refine.requested',
      'session.status_running',
    ])

    async function connect() {
      while (!stopped) {
        try {
          const res = await fetch(
            `/api/missions/${missionId}/events?after=${lastIdRef.current}`,
            { signal: controller.signal }
          )
          if (!res.ok || !res.body) throw new Error(`feed ${res.status}`)
          setReconnecting(false)
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const messages = buffer.split('\n\n')
            buffer = messages.pop() ?? ''
            for (const message of messages) {
              const line = message
                .split('\n')
                .find((l) => l.startsWith('data: '))
              if (!line) continue
              const parsed = JSON.parse(line.slice(6)) as
                | { kind: 'event'; event: TimelineRow }
                | { kind: 'done'; status: MissionStatus }
              if (parsed.kind === 'event') {
                if (parsed.event.id > lastIdRef.current) {
                  lastIdRef.current = parsed.event.id
                  setRows((prev) => [...prev, parsed.event])
                  if (
                    parsed.event.created_at > mountedAtRef.current &&
                    LIVE_TYPES.has(parsed.event.event_type)
                  ) {
                    onStatusChange('in_progress')
                  }
                }
              } else {
                onStatusChange(parsed.status)
                return
              }
            }
          }
          // Feed closed without a done sentinel (deploy, timeout): reconnect.
          throw new Error('feed closed')
        } catch {
          if (stopped || controller.signal.aborted) return
          setReconnecting(true)
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }
    }

    void connect()
    return () => {
      stopped = true
      controller.abort()
    }
  }, [missionId, onStatusChange, status])

  // Follow the live tail unless the reader scrolled up to inspect something.
  useEffect(() => {
    if (pinnedToEnd && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [rows, pinnedToEnd])

  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setPinnedToEnd(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
  }, [])

  async function stopRun() {
    setStopping(true)
    try {
      await fetch(`/api/missions/${missionId}/stop`, { method: 'POST' })
      // The events feed delivers the terminal state; nothing else to do.
    } finally {
      setStopping(false)
      setStopOpen(false)
    }
  }

  // Render from the latest attempt; earlier attempts stay available above.
  const lastStart = rows.findLast((r) => r.event_type === 'run.started')
  const visible = lastStart ? rows.filter((r) => r.id >= lastStart.id) : rows
  const priorAttempts = rows.filter(
    (r) => r.event_type === 'run.started'
  ).length

  if (rows.length === 0 && !running) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Each step {agentName} takes, as it happens.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin stroke-[1.75]" />
                  Working
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStopOpen(true)}
                  disabled={stopping}
                >
                  <Square data-icon="inline-start" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reconnecting && (
          <p className="mb-2 text-xs text-muted-foreground">
            Reconnecting to the live view…
          </p>
        )}
        {priorAttempts > 1 && (
          <p className="mb-2 text-xs text-muted-foreground">
            Showing the latest run. Earlier attempts are kept in the log.
          </p>
        )}
        <div className="relative">
          <div
            ref={listRef}
            onScroll={onScroll}
            className="grid max-h-112 gap-2 overflow-y-auto pr-1"
          >
            {visible.length === 0 && running && (
              <p className="text-sm text-muted-foreground">Starting…</p>
            )}
            {visible.map((row, i) => (
              <EventCard
                key={row.id}
                row={row}
                rows={visible}
                index={i}
                agentName={agentName}
              />
            ))}
          </div>
          {!pinnedToEnd && running && (
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 shadow-sm"
              onClick={() => {
                setPinnedToEnd(true)
                if (listRef.current) {
                  listRef.current.scrollTop = listRef.current.scrollHeight
                }
              }}
            >
              <ArrowDown data-icon="inline-start" />
              Jump to latest
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>Stop this run?</DialogTitle>
            <DialogDescription>
              The agent will stop where it is. Anything already finished is
              kept, and you can run it again any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopOpen(false)}>
              Keep working
            </Button>
            <Button
              variant="destructive"
              onClick={stopRun}
              disabled={stopping}
            >
              {stopping && (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Stop run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function Row({
  icon: Icon,
  tone = 'default',
  children,
}: {
  icon: typeof Globe
  tone?: 'default' | 'error' | 'success'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2',
        tone === 'error' && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground',
          tone === 'error' && 'text-destructive',
          tone === 'success' && 'text-primary'
        )}
      />
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  )
}

function Expandable({
  icon,
  summary,
  detail,
  tone = 'default',
}: {
  icon: typeof Globe
  summary: React.ReactNode
  detail: string
  tone?: 'default' | 'error'
}) {
  const [open, setOpen] = useState(false)
  const Icon = icon
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background',
        tone === 'error' && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 px-3 py-2 text-left"
      >
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground',
            tone === 'error' && 'text-destructive'
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm">{summary}</span>
        <ChevronDown
          className={cn(
            'mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <pre className="max-h-56 overflow-auto font-mono text-xs whitespace-pre-wrap">
            {detail}
          </pre>
        </div>
      )}
    </div>
  )
}

function EventCard({
  row,
  rows,
  index,
  agentName,
}: {
  row: TimelineRow
  rows: TimelineRow[]
  index: number
  agentName: string
}) {
  const p = row.payload

  switch (row.event_type) {
    case 'run.started':
      return (
        <Row icon={Play}>
          <span className="text-muted-foreground">
            Run started{p.web_search ? ' with web search on' : ''}.
          </span>
        </Row>
      )
    case 'user.message': {
      // The kickoff brief is already shown in the Brief card above; later
      // user messages are follow-ups worth showing.
      const isKickoff = !rows
        .slice(0, index)
        .some((r) => r.event_type === 'user.message')
      if (isKickoff) {
        return (
          <Row icon={Send}>
            <span className="text-muted-foreground">
              Brief sent to {agentName}.
            </span>
          </Row>
        )
      }
      return null
    }
    case 'refine.requested':
      return (
        <Row icon={Send}>
          <span className="text-muted-foreground">You asked:</span>{' '}
          {String(p.note ?? '')}
        </Row>
      )
    case 'agent.thinking': {
      const text = textFromBlocks(p)
      if (!text) return null
      return (
        <Expandable
          icon={Brain}
          summary={<span className="text-muted-foreground">Thinking</span>}
          detail={text}
        />
      )
    }
    case 'agent.tool_use': {
      const name = String(p.name ?? 'tool')
      const meta = TOOL_META[name] ?? { icon: Wrench, verb: `Used ${name}` }
      const result = rows.find(
        (r) =>
          r.event_type === 'agent.tool_result' && r.payload.tool_use_id === p.id
      )
      const summaryInput = toolSummary(name, p.input)
      const detailParts = [JSON.stringify(p.input ?? {}, null, 2)]
      if (result) {
        const resultText = textFromBlocks(result.payload)
        if (resultText) detailParts.push(`\nResult:\n${resultText}`)
      }
      return (
        <Expandable
          icon={meta.icon}
          tone={result?.payload.is_error ? 'error' : 'default'}
          summary={
            <>
              {meta.verb}
              {summaryInput && (
                <span className="text-muted-foreground">
                  {' '}
                  · {summaryInput}
                </span>
              )}
            </>
          }
          detail={detailParts.join('\n')}
        />
      )
    }
    case 'agent.tool_result':
      return null // Rendered inside its matching tool_use card.
    case 'agent.message': {
      const text = textFromBlocks(p)
      if (!text) return null
      return (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      )
    }
    case 'session.error':
      return (
        <Row icon={CircleAlert} tone="error">
          {String(
            (p.error as { message?: string } | undefined)?.message ??
              'Something went wrong.'
          )}
        </Row>
      )
    case 'run.failed':
      return (
        <Row icon={CircleAlert} tone="error">
          The run hit a problem: {String(p.message ?? 'unknown error')}. Your
          brief is saved, so you can try again.
        </Row>
      )
    case 'run.stopped':
      return (
        <Row icon={OctagonX}>
          You stopped this run. Everything it finished is kept.
        </Row>
      )
    case 'run.completed':
      return (
        <Row icon={CircleCheck} tone="success">
          Done. The result is below.
        </Row>
      )
    default:
      // Status and span events are heartbeat noise; anything unknown renders
      // harmlessly rather than breaking the timeline.
      if (
        row.event_type.startsWith('session.') ||
        row.event_type.startsWith('span.') ||
        row.event_type.startsWith('user.')
      ) {
        return null
      }
      return (
        <Row icon={Wrench}>
          <span className="text-muted-foreground">{row.event_type}</span>
        </Row>
      )
  }
}
