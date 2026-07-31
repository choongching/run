'use client'

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ArrowUp,
  CircleCheck,
  FileText,
  FileUp,
  Loader2,
  Paperclip,
  Square,
  TriangleAlert,
  X,
} from 'lucide-react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

import { ApprovalCard, type ApprovalCall } from '@/components/chat/approval-card'
import { ArtifactCard, type ArtifactMeta } from '@/components/chat/artifact-card'
import { ConnectCard } from '@/components/chat/connect-card'
import { Markdown } from '@/components/chat/markdown'
import { RunDonut } from '@/components/usage/run-donut'
import { OptionsCard } from '@/components/chat/options-card'
import { ReviewCard, type ReviewSpec } from '@/components/chat/review-card'
import { ErrorNote } from '@/components/chat/error-note'
import type { ChatError } from '@/lib/chat/errors'
import {
  ACCEPT_ATTR,
  ACCEPTED_HINT,
  humanSize,
  kindOf,
  matchType,
  maxBytesFor,
} from '@/lib/files/accepted'
import { MAX_MESSAGE_CHARS } from '@/lib/chat/limits'
import { useAutoGrow } from '@/lib/use-auto-grow'
import type { AskSpec } from '@/lib/tools/definitions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type AskState = AskSpec & { id: string }

type ChatRole = 'user' | 'agent' | 'activity'

export type AttachmentMeta = {
  name: string
  type: string
  size: number
  kind?: 'document' | 'image'
  // A small preview data URI, present for images.
  thumb?: string
}

export type ChatMessage = {
  id: string | number
  role: ChatRole
  content: string
  // ISO timestamp, for the day divider and the hover-reveal time.
  createdAt?: string
  attachments?: AttachmentMeta[]
  artifact?: ArtifactMeta
  // For activity rows: the present-tense label to show while the step runs
  // (content holds the past-tense label shown once it is done).
  activityPresent?: string
}

// The composer's in-progress attachment: validated and confirmed on attach, so
// its status (and, for images, its thumbnail) is known before the message is
// sent.
type Attachment = AttachmentMeta & {
  status: 'checking' | 'ready' | 'error'
  reason?: string
}

type Draft = { text: string; phase: 'thinking' | 'streaming' } | null

type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; present: string; past: string }
  | { type: 'artifact'; title: string; format: 'markdown'; content: string }
  | { type: 'connect'; app: string }
  | { type: 'approval'; calls: ApprovalCall[] }
  | ({ type: 'ask' } & AskState)
  | ({ type: 'review'; id: string } & ReviewSpec)
  | { type: 'onboarded' }
  | { type: 'done'; text: string }
  | ({ type: 'error' } & ChatError)

export function ChatThread({
  agentId,
  agentName,
  initialMessages,
  initialApproval,
  onboarding,
  initialAsk,
  initialReview,
  initialAttachment,
}: {
  agentId: string
  agentName: string
  initialMessages: ChatMessage[]
  initialApproval: ApprovalCall[] | null
  onboarding: boolean
  initialAsk: AskState | null
  initialReview: ReviewSpec | null
  initialAttachment: AttachmentMeta | null
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState<Draft>(null)
  const [running, setRunning] = useState(false)
  const [input, setInput] = useState('')
  const [connectApp, setConnectApp] = useState<string | null>(null)
  const [approval, setApproval] = useState<ApprovalCall[] | null>(initialApproval)
  const [ask, setAsk] = useState<AskState | null>(initialAsk)
  // The setup proposal awaiting a decision. Cleared the moment anything else
  // happens in the thread, including the person typing a correction, because
  // the agent will propose again with the new wording.
  const [review, setReview] = useState<ReviewSpec | null>(initialReview)
  // The last turn's failure, and the way to run that same turn again. Retrying
  // is only offered where repeating the request is safe, which is why it lives
  // in a ref set by whoever started the turn rather than being assumed.
  const [failure, setFailure] = useState<ChatError | null>(null)
  // Whether this particular failure has something safe to repeat. Captured when
  // the failure happens rather than read from the ref while rendering, which
  // React forbids.
  const [canRetry, setCanRetry] = useState(false)
  const retryRef = useRef<(() => Promise<void>) | null>(null)
  const [attachment, setAttachment] = useState<Attachment | null>(
    initialAttachment ? { ...initialAttachment, status: 'ready' } : null
  )
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  // Local ids for optimistic rows; DB ids replace them on reload.
  const tempId = useRef(-1)
  // Guards the one-time onboarding kickoff so it fires at most once.
  const onboardingStarted = useRef(false)
  // Captured once so day labels stay stable across renders (lazy init is pure).
  const [now] = useState(() => new Date())
  // Time-formatted UI (day dividers, hover times) is locale/timezone dependent,
  // so render it only after mount to avoid an SSR/client hydration mismatch and
  // to show times in the viewer's timezone, not the server's. useSyncExternalStore
  // is the hydration-safe way to detect mount (false on server, true on client).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

  function commitDraft() {
    setDraft((d) => {
      if (d?.text) {
        setMessages((prev) => [
          ...prev,
          { id: tempId.current--, role: 'agent', content: d.text, createdAt: nowIso() },
        ])
      }
      return null
    })
  }

  function finishWithError(error: ChatError) {
    setDraft(null)
    // An empty message means nothing went wrong worth saying: a turn the person
    // stopped themselves, for instance.
    if (!error.message) return
    setCanRetry(error.retry && retryRef.current !== null)
    setFailure(error)
  }

  function handleFrame(frame: Frame) {
    switch (frame.type) {
      case 'start':
      case 'thinking':
        setDraft((d) => d ?? { text: '', phase: 'thinking' })
        return
      case 'delta':
        setDraft((d) => ({
          text: (d?.text ?? '') + frame.text,
          phase: 'streaming',
        }))
        return
      case 'activity':
        setMessages((prev) => [
          ...prev,
          {
            id: tempId.current--,
            role: 'activity',
            content: frame.past,
            activityPresent: frame.present,
            createdAt: nowIso(),
          },
        ])
        return
      case 'artifact':
        setMessages((prev) => [
          ...prev,
          {
            id: tempId.current--,
            role: 'agent',
            content: '',
            createdAt: nowIso(),
            artifact: {
              title: frame.title,
              format: frame.format,
              content: frame.content,
            },
          },
        ])
        return
      case 'connect':
        setConnectApp(frame.app)
        return
      case 'approval':
        setApproval(frame.calls)
        return
      case 'ask':
        setAsk(frame)
        return
      case 'review':
        setReview({
          name: frame.name,
          instructions: frame.instructions,
          connectors: frame.connectors,
        })
        return
      case 'onboarded':
        // Setup finished: refresh so the server no longer treats this as a new
        // agent (the first task keeps streaming in this same response).
        onboardingStarted.current = true
        router.refresh()
        return
      case 'done':
        if (frame.text) {
          setMessages((prev) => [
            ...prev,
            { id: tempId.current--, role: 'agent', content: frame.text, createdAt: nowIso() },
          ])
        }
        setDraft(null)
        // The turn just spent a run, and the meter lives in the shell where
        // this component cannot reach it. Refreshing re-renders the server
        // layout with the new count, which also means a turn that failed or
        // paused correctly does not move the number.
        router.refresh()
        return
      case 'error':
        finishWithError(frame)
        return
    }
  }

  // Read the newline-delimited JSON stream, dispatching each frame. Shared by
  // a new message and an approval decision (both resume the same session).
  async function consumeStream(res: Response) {
    if (!res.ok || !res.body) {
      // A route refused before any streaming started. Those messages are ours
      // and already written for a person, so they pass straight through.
      const info = await res.json().catch(() => null)
      finishWithError({
        message: info?.error ?? 'Your agent could not answer just now.',
        sub: info?.sub,
        retry: res.status >= 500 || res.status === 429,
      })
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) handleFrame(JSON.parse(line) as Frame)
      }
    }
  }

  async function runStream(fetchStream: (signal: AbortSignal) => Promise<Response>) {
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setConnectApp(null)
    setApproval(null)
    setAsk(null)
    setReview(null)
    setFailure(null)
    setDraft({ text: '', phase: 'thinking' })
    try {
      await consumeStream(await fetchStream(controller.signal))
    } catch {
      if (controller.signal.aborted) commitDraft()
      else
        finishWithError({
          message: 'We lost the connection partway through.',
          sub: 'Anything above is what arrived before it dropped.',
          retry: true,
        })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
  }

  // Attach a file: reject early on type/size, then process server-side (extract
  // a document's text, or resize an image) so the chip can confirm it is
  // readable, and show an image's thumbnail, before the message is sent.
  async function pickFile(file: File) {
    const kind = kindOf(file.name, file.type)
    if (!kind) {
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        kind: 'document',
        status: 'error',
        reason: "That file type isn't supported yet.",
      })
      return
    }
    const base = { name: file.name, type: file.type, size: file.size, kind }
    if (file.size > maxBytesFor(kind)) {
      setAttachment({
        ...base,
        status: 'error',
        reason: `That file is ${humanSize(file.size)}. The limit is ${kind === 'image' ? '10' : '15'} MB.`,
      })
      return
    }
    setAttachment({ ...base, status: 'checking' })
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/chat/${agentId}/attach`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => null)
      if (data?.ok) {
        setAttachment({
          name: data.name,
          type: data.type,
          size: data.size,
          kind: data.kind,
          thumb: data.thumb,
          status: 'ready',
        })
      } else {
        setAttachment({
          ...base,
          status: 'error',
          reason: data?.reason ?? "We couldn't read this file.",
        })
      }
    } catch {
      setAttachment({ ...base, status: 'error', reason: 'Upload failed. Try again.' })
    }
  }

  function removeAttachment() {
    setAttachment(null)
    // Best-effort: clear the server-side pending file too.
    void fetch(`/api/chat/${agentId}/attach`, { method: 'DELETE' })
  }

  const canSend =
    !running &&
    ask === null &&
    attachment?.status !== 'checking' &&
    attachment?.status !== 'error' &&
    (input.trim().length > 0 || attachment?.status === 'ready')

  async function send() {
    if (!canSend) return
    const text = input.trim()
    const sent =
      attachment?.status === 'ready'
        ? [
            {
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              kind: attachment.kind,
              thumb: attachment.thumb,
            },
          ]
        : undefined
    setInput('')
    setAttachment(null)
    setMessages((prev) => [
      ...prev,
      {
        id: tempId.current--,
        role: 'user',
        content: text,
        attachments: sent,
        createdAt: nowIso(),
      },
    ])
    const run = (retry: boolean) => () =>
      runStream((signal) =>
        fetch(`/api/chat/${agentId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, retry }),
          signal,
        })
      )
    // The retry sends the same text again, flagged so the transcript does not
    // gain a second copy of a message that is already in it.
    retryRef.current = run(true)
    await run(false)()
  }

  async function respondToApproval(decision: 'approve' | 'deny') {
    if (running) return
    await runStream((signal) =>
      fetch(`/api/chat/${agentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
        signal,
      })
    )
  }

  // The user just connected an account the agent was waiting on. Refresh the
  // server-rendered connection state (the config panel reads it) so it stops
  // showing stale status, then resume the paused task automatically, so they
  // never have to tell the agent they finished connecting. runStream clears the
  // connect card as it starts the continuation.
  async function resumeAfterConnect() {
    router.refresh()
    if (running) return
    await runStream((signal) =>
      fetch(`/api/chat/${agentId}/resume`, { method: 'POST', signal })
    )
  }

  // Answer an ask_user question: show the choice and resume the session.
  async function respondToAsk(answer: string) {
    if (running) return
    setMessages((prev) => [
      ...prev,
      { id: tempId.current--, role: 'user', content: answer, createdAt: nowIso() },
    ])
    await runStream((signal) =>
      fetch(`/api/chat/${agentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
        signal,
      })
    )
  }

  // Confirm the proposed setup: save it, then let the agent begin. The card
  // disappears as the first task starts streaming into the thread.
  async function confirmSetup(values: { name: string; instructions: string }) {
    if (running) return
    await runStream((signal) =>
      fetch(`/api/chat/${agentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal,
      })
    )
  }

  // The first-run setup interview. Fires once when a brand-new agent's chat
  // opens with nothing in it; the agent introduces itself and asks its
  // questions. Reloads mid-interview show the pending question instead.
  useEffect(() => {
    if (
      onboarding &&
      !onboardingStarted.current &&
      messages.length === 0 &&
      !ask &&
      !running
    ) {
      onboardingStarted.current = true
      void runStream((signal) =>
        fetch(`/api/chat/${agentId}/onboarding`, { method: 'POST', signal })
      )
    }
    // Intentionally runs once on mount for a fresh agent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stop() {
    abortRef.current?.abort()
  }

  // Drag-and-drop a file anywhere over the chat pane. A depth counter keeps the
  // overlay steady as the cursor crosses child elements.
  function dragHasFile(e: React.DragEvent) {
    return Array.from(e.dataTransfer.types).includes('Files')
  }
  function onDragEnter(e: React.DragEvent) {
    if (running || ask || !dragHasFile(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }
  function onDragOver(e: React.DragEvent) {
    if (running || ask || !dragHasFile(e)) return
    e.preventDefault()
  }
  function onDragLeave() {
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }
  function onDrop(e: React.DragEvent) {
    dragDepth.current = 0
    setDragging(false)
    if (running || ask) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      e.preventDefault()
      void pickFile(file)
    }
  }

  const isEmpty = messages.length === 0 && !draft

  // Two or more step lines in a row collapse into one compact block, so the
  // work is there for whoever wants it without filling the conversation.
  // A single step stays a plain line: one line IS the compact form.
  // Memoized because this recomputes on every frame of a live turn.
  const blocks = useMemo(() => {
    const out: {
      kind: 'msg' | 'steps'
      items: ChatMessage[]
      startIndex: number
    }[] = []
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (m.role === 'activity') {
        const run: ChatMessage[] = [m]
        while (messages[i + 1]?.role === 'activity') run.push(messages[++i])
        out.push({
          kind: run.length > 1 ? 'steps' : 'msg',
          items: run.length > 1 ? run : [m],
          startIndex: i - run.length + 1,
        })
        // A run of single activities: each its own msg block.
        if (run.length === 1) continue
      } else {
        out.push({ kind: 'msg', items: [m], startIndex: i })
      }
    }
    return out
  }, [messages])

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <StickToBottom
        className="relative min-h-0 flex-1 overflow-y-auto"
        resize="smooth"
        initial="instant"
      >
        <StickToBottom.Content className="mx-auto flex w-full max-w-thread flex-col gap-5 px-1 py-6">
          {isEmpty && !onboarding && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Say hello to {agentName} to get started.
            </p>
          )}

          {blocks.map((block) => {
            const first = block.items[0]
            const prev = messages[block.startIndex - 1]
            const showDay =
              first.createdAt &&
              (!prev?.createdAt ||
                dayKey(prev.createdAt) !== dayKey(first.createdAt))
            const blockIsLive =
              running &&
              block.startIndex + block.items.length === messages.length
            return (
              <Fragment key={first.id}>
                {showDay && mounted && (
                  <DayDivider label={formatDay(first.createdAt!, now)} />
                )}
                {block.kind === 'steps' ? (
                  <StepsBlock steps={block.items} running={blockIsLive} />
                ) : (
                  <MessageRow
                    message={first}
                    live={blockIsLive}
                    showTime={mounted}
                  />
                )}
              </Fragment>
            )
          })}

          {draft && <DraftBubble draft={draft} />}

          {connectApp && (
            <ConnectCard app={connectApp} onConnected={resumeAfterConnect} />
          )}

          {approval && (
            <ApprovalCard calls={approval} onDecision={respondToApproval} />
          )}

          {ask && <OptionsCard spec={ask} onAnswer={respondToAsk} />}

          {review && <ReviewCard spec={review} onConfirm={confirmSetup} />}

          {failure && (
            <ErrorNote
              error={failure}
              onRetry={
                canRetry
                  ? () => {
                      const again = retryRef.current
                      if (again) void again()
                    }
                  : undefined
              }
            />
          )}
        </StickToBottom.Content>
        <JumpToLatest />
      </StickToBottom>

      <div className="mx-auto w-full max-w-thread px-1 pb-2">
        <Composer
          value={input}
          onChange={setInput}
          onSend={send}
          onStop={stop}
          canSend={canSend}
          running={running}
          blocked={ask !== null}
          agentId={agentId}
          agentName={agentName}
          attachment={attachment}
          onPickFile={pickFile}
          onRemoveAttachment={removeAttachment}
        />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-primary/35 bg-background/80 duration-150 animate-in fade-in-0 motion-reduce:animate-none">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary duration-200 animate-in zoom-in-95 motion-reduce:animate-none">
            <FileUp className="size-6" />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Drop your file here
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ACCEPTED_HINT}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// A stable no-op subscribe for useSyncExternalStore-based mount detection.
const noopSubscribe = () => () => {}

// Local time helpers for message timestamps. Client-side (the browser's clock
// and locale), so live messages read the same as reloaded ones.
function nowIso(): string {
  return new Date().toISOString()
}

// A stable per-day key, for grouping messages under date dividers.
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// "Today", "Yesterday", or a short date, relative to `now` (captured once).
function formatDay(iso: string, now: Date): string {
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// A short local time like "2:04 PM".
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// A centered date separator shown between messages from different days.
function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

// A floating "jump to latest" affordance: shows when the user has scrolled up
// away from the newest message, and snaps back to the bottom on click. Reads its
// state from the scroll container (use-stick-to-bottom), so it must render inside
// StickToBottom. Sticky so it hovers just above the composer while scrolling.
// One control in the composer's action row. Square, on the radius scale, and
// always labelled: the icons alone (a plus, an arrow, a square) do not say what
// they do, and the tooltip is the only place that can.
//
// The tooltip carries the action and nothing else. An earlier version appended
// the accepted file types, which wrapped the bubble into two ragged columns to
// say something the file picker says anyway. The types stay in the accessible
// name, where they cost no layout.
function ComposerButton({
  label,
  hint,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string
  hint?: string
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onClick}
              disabled={disabled}
              aria-label={hint ? `${label} (${hint})` : label}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
                className
              )}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function JumpToLatest() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()
  if (isAtBottom) return null
  return (
    // A compact square rather than a labelled pill. The pill was wide enough to
    // sit over the last line of the message it was covering, which is the one
    // thing a "you are not at the bottom" control must not do.
    <div className="pointer-events-none sticky bottom-3 z-10 flex justify-center">
      <button
        type="button"
        onClick={() => scrollToBottom()}
        aria-label="Jump to the latest message"
        className="pointer-events-auto flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors animate-in fade-in-0 slide-in-from-bottom-1 hover:text-foreground motion-reduce:animate-none"
      >
        <ChevronDown className="size-4.5" />
      </button>
    </div>
  )
}

// A run of steps folded into one quiet line. Closed it reads "5 steps";
// while the agent is still working it shows the step underway instead, so
// the feedback never disappears. Open, it lists every step. Closed is the
// default, including on reload: not everyone wants the little details.
function StepsBlock({
  steps,
  running,
}: {
  steps: ChatMessage[]
  running: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = steps[steps.length - 1]
  const headerLabel =
    running && !open
      ? `${current.activityPresent ?? current.content}…`
      : `${steps.length} steps`
  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 hover:text-foreground"
      >
        {running && !open ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform',
              !open && '-rotate-90'
            )}
          />
        )}
        <span className={cn(running && !open && 'text-shimmer font-medium')}>
          {headerLabel}
        </span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 pl-5.5">
          {steps.map((s, idx) => {
            const isLive = running && idx === steps.length - 1
            return (
              <div key={s.id} className="flex items-center gap-2">
                {isLive ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <CircleCheck className="size-3.5 shrink-0 text-primary/70" />
                )}
                <span className={cn(isLive && 'text-shimmer font-medium')}>
                  {isLive ? (s.activityPresent ?? s.content) : s.content}
                  {isLive ? '…' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MessageRow({
  message,
  live,
  showTime,
}: {
  message: ChatMessage
  live: boolean
  showTime: boolean
}) {
  if (message.role === 'user') {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="flex max-w-[85%] flex-col gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-sm">
          {message.attachments?.map((a, i) =>
            a.kind === 'image' && a.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={a.thumb}
                alt={a.name}
                className="max-h-56 max-w-[280px] rounded-lg border border-border object-contain"
              />
            ) : (
              <FileChip key={i} file={a} />
            )
          )}
          {message.content && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
        {showTime && message.createdAt && (
          <time className="pr-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </time>
        )}
      </div>
    )
  }

  if (message.role === 'activity') {
    // Present tense while the step runs (spinner), past tense once it settles to
    // a green check. Reloaded history has only the past form, and is never live.
    const label = live
      ? (message.activityPresent ?? message.content)
      : message.content
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {live ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <CircleCheck className="size-3.5 shrink-0 text-primary/70" />
        )}
        <span className={cn(live && 'text-shimmer font-medium')}>
          {label}
          {live ? '…' : ''}
        </span>
      </div>
    )
  }

  if (message.artifact) {
    return (
      <div className="group flex flex-col gap-2">
        {message.content && <Markdown>{message.content}</Markdown>}
        <ArtifactCard artifact={message.artifact} />
        {showTime && message.createdAt && (
          <time className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </time>
        )}
      </div>
    )
  }

  return (
    <div className="group">
      {/* A failure is never a message. It is a note below the conversation
          that clears the moment the next turn starts, so a transcript read back
          later shows the work rather than an outage we already recovered from. */}
      <div className="text-sm">
        <Markdown>{message.content}</Markdown>
      </div>
      {showTime && message.createdAt && (
        <time className="mt-1 block text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {formatTime(message.createdAt)}
        </time>
      )}
    </div>
  )
}

// The attachment chip, shared by the composer (interactive, with states and a
// remove control) and the sent message bubble (a static label).
function FileChip({
  file,
  attachment,
  onRemove,
}: {
  file?: AttachmentMeta
  attachment?: Attachment
  onRemove?: () => void
}) {
  const meta = attachment ?? file!
  const status = attachment?.status ?? 'ready'
  const bad = status === 'error'
  const checking = status === 'checking'
  const isImage = (meta.kind ?? 'document') === 'image'
  const thumb = meta.thumb
  const label = matchType(meta.name, meta.type)?.label

  let sub: string
  if (checking) sub = isImage ? 'processing…' : 'reading…'
  else if (bad) sub = attachment?.reason ?? 'Could not read this file'
  else if (isImage) sub = `Image · ${humanSize(meta.size)}`
  else
    sub =
      `${label ?? 'File'} · ${humanSize(meta.size)}` +
      (attachment ? ' · text ready' : '')

  return (
    <div
      className={cn(
        'inline-flex max-w-[300px] items-center gap-2.5 rounded-lg border p-2',
        bad
          ? 'border-destructive/40 bg-destructive/[0.06]'
          : 'border-border bg-background'
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md',
          bad
            ? 'bg-destructive/10 text-destructive'
            : checking
              ? 'bg-muted text-muted-foreground'
              : isImage && thumb
                ? ''
                : 'bg-primary/[0.08] text-primary'
        )}
      >
        {checking ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : bad ? (
          <TriangleAlert className="size-3.5" />
        ) : isImage && thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="size-7 object-cover" />
        ) : (
          <FileText className="size-3.5" />
        )}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            'truncate text-[13px] font-medium',
            bad && 'text-destructive'
          )}
        >
          {meta.name}
        </span>
        <span className="truncate text-[11px] text-muted-foreground tabular-nums">
          {sub}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove file"
          className="ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function DraftBubble({ draft }: { draft: NonNullable<Draft> }) {
  if (draft.phase === 'thinking') {
    return (
      <div className="text-sm">
        <span className="text-shimmer font-medium">Thinking</span>
      </div>
    )
  }
  return (
    <div className="text-sm">
      <span className="stream-caret">
        <Markdown>{draft.text}</Markdown>
      </span>
    </div>
  )
}

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  canSend,
  running,
  blocked,
  agentId,
  agentName,
  attachment,
  onPickFile,
  onRemoveAttachment,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  canSend: boolean
  running: boolean
  blocked: boolean
  agentId: string
  agentName: string
  attachment: Attachment | null
  onPickFile: (file: File) => void
  onRemoveAttachment: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  // Also runs after a send clears the value, which is what takes a grown box
  // back down to one line instead of leaving it standing open and empty.
  useAutoGrow(textRef, value)

  return (
    <div className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/50">
      {attachment && (
        <div className="px-3 pt-3">
          <FileChip attachment={attachment} onRemove={onRemoveAttachment} />
        </div>
      )}
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (canSend) onSend()
          }
        }}
        onPaste={(e) => {
          const file = e.clipboardData?.files?.[0]
          if (file && !running && !blocked) {
            e.preventDefault()
            onPickFile(file)
          }
        }}
        rows={1}
        maxLength={MAX_MESSAGE_CHARS}
        disabled={blocked}
        placeholder={
          blocked ? 'Choose an option above to continue' : `Message ${agentName}...`
        }
        className="max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      {/* All three controls sit together at the trailing edge (founder
          call): the meter, then attach, then send. */}
      <div className="flex items-center justify-end px-3 pb-3">
        <div className="flex items-center gap-1.5">
          <RunDonut agentId={agentId} />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickFile(file)
            e.target.value = ''
          }}
        />
        <ComposerButton
          label="Attach files"
          hint={ACCEPTED_HINT}
          onClick={() => fileInputRef.current?.click()}
          disabled={running || blocked}
          className="bg-muted text-foreground hover:bg-muted-foreground/15"
        >
          <Paperclip className="size-4" />
        </ComposerButton>
        {running ? (
          <ComposerButton
            label="Stop"
            onClick={onStop}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            <Square className="size-3 rounded-sm fill-current" />
          </ComposerButton>
        ) : (
          <ComposerButton
            label="Send"
            onClick={onSend}
            disabled={!canSend}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            <ArrowUp className="size-4" />
          </ComposerButton>
        )}
        </div>
      </div>
    </div>
  )
}
