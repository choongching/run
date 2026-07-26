'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowUp,
  CircleCheck,
  FileText,
  Loader2,
  Paperclip,
  Square,
  TriangleAlert,
  X,
} from 'lucide-react'
import { StickToBottom } from 'use-stick-to-bottom'

import { ApprovalCard, type ApprovalCall } from '@/components/chat/approval-card'
import { ConnectCard } from '@/components/chat/connect-card'
import { Markdown } from '@/components/chat/markdown'
import { OptionsCard } from '@/components/chat/options-card'
import {
  ACCEPT_ATTR,
  ACCEPTED_HINT,
  humanSize,
  isAccepted,
  matchType,
  MAX_FILE_BYTES,
} from '@/lib/files/accepted'
import type { AskSpec } from '@/lib/tools/definitions'
import { cn } from '@/lib/utils'

type AskState = AskSpec & { id: string }

type ChatRole = 'user' | 'agent' | 'activity'

export type AttachmentMeta = { name: string; type: string; size: number }

export type ChatMessage = {
  id: string | number
  role: ChatRole
  content: string
  error?: boolean
  attachments?: AttachmentMeta[]
}

// The composer's in-progress attachment: extracted and confirmed on attach, so
// its status is known before the message is sent.
type Attachment = AttachmentMeta & {
  status: 'checking' | 'ready' | 'error'
  reason?: string
}

type Draft = { text: string; phase: 'thinking' | 'streaming' } | null

type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; label: string }
  | { type: 'connect'; app: string }
  | { type: 'approval'; calls: ApprovalCall[] }
  | ({ type: 'ask' } & AskState)
  | { type: 'onboarded' }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

export function ChatThread({
  agentId,
  agentName,
  initialMessages,
  initialApproval,
  onboarding,
  initialAsk,
  initialAttachment,
}: {
  agentId: string
  agentName: string
  initialMessages: ChatMessage[]
  initialApproval: ApprovalCall[] | null
  onboarding: boolean
  initialAsk: AskState | null
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

  function commitDraft() {
    setDraft((d) => {
      if (d?.text) {
        setMessages((prev) => [
          ...prev,
          { id: tempId.current--, role: 'agent', content: d.text },
        ])
      }
      return null
    })
  }

  function finishWithError(message: string) {
    setDraft(null)
    setMessages((prev) => [
      ...prev,
      { id: tempId.current--, role: 'agent', content: message, error: true },
    ])
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
          { id: tempId.current--, role: 'activity', content: frame.label },
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
            { id: tempId.current--, role: 'agent', content: frame.text },
          ])
        }
        setDraft(null)
        return
      case 'error':
        finishWithError(frame.message)
        return
    }
  }

  // Read the newline-delimited JSON stream, dispatching each frame. Shared by
  // a new message and an approval decision (both resume the same session).
  async function consumeStream(res: Response) {
    if (!res.ok || !res.body) {
      const info = await res.json().catch(() => null)
      finishWithError(info?.error ?? 'The agent could not respond.')
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
    setDraft({ text: '', phase: 'thinking' })
    try {
      await consumeStream(await fetchStream(controller.signal))
    } catch (err) {
      if (controller.signal.aborted) commitDraft()
      else
        finishWithError(
          err instanceof Error ? err.message : 'The connection dropped.'
        )
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
  }

  // Attach a file: reject early on size/type, then extract server-side so the
  // chip can confirm the text is readable (or say why not) before sending.
  async function pickFile(file: File) {
    const base = { name: file.name, type: file.type, size: file.size }
    if (file.size > MAX_FILE_BYTES) {
      setAttachment({
        ...base,
        status: 'error',
        reason: `That file is ${humanSize(file.size)}. The limit is 15 MB.`,
      })
      return
    }
    if (!isAccepted(file.name, file.type)) {
      setAttachment({
        ...base,
        status: 'error',
        reason: "That file type isn't supported yet.",
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
        ? [{ name: attachment.name, type: attachment.type, size: attachment.size }]
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
      },
    ])
    await runStream((signal) =>
      fetch(`/api/chat/${agentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      })
    )
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

  // Answer an ask_user question: show the choice and resume the session.
  async function respondToAsk(answer: string) {
    if (running) return
    setMessages((prev) => [
      ...prev,
      { id: tempId.current--, role: 'user', content: answer },
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
        <StickToBottom.Content className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 py-6">
          {isEmpty && !onboarding && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Say hello to {agentName} to get started.
            </p>
          )}

          {messages.map((m, i) => (
            <MessageRow
              key={m.id}
              message={m}
              live={running && i === messages.length - 1}
            />
          ))}

          {draft && <DraftBubble draft={draft} />}

          {connectApp && (
            <ConnectCard
              app={connectApp}
              onConnected={() => setConnectApp(null)}
            />
          )}

          {approval && (
            <ApprovalCard calls={approval} onDecision={respondToApproval} />
          )}

          {ask && <OptionsCard spec={ask} onAnswer={respondToAsk} />}
        </StickToBottom.Content>
      </StickToBottom>

      <div className="mx-auto w-full max-w-3xl px-1 pb-2">
        <Composer
          value={input}
          onChange={setInput}
          onSend={send}
          onStop={stop}
          canSend={canSend}
          running={running}
          blocked={ask !== null}
          agentName={agentName}
          attachment={attachment}
          onPickFile={pickFile}
          onRemoveAttachment={removeAttachment}
        />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-primary bg-primary/[0.06] text-primary backdrop-blur-[1px]">
          <ArrowDownToLine className="size-6" />
          <span className="text-sm font-medium">Drop to attach</span>
        </div>
      )}
    </div>
  )
}

function MessageRow({
  message,
  live,
}: {
  message: ChatMessage
  live: boolean
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-sm">
          {message.attachments?.map((a, i) => (
            <FileChip key={i} file={a} />
          ))}
          {message.content && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
      </div>
    )
  }

  if (message.role === 'activity') {
    // Completed steps settle to a green check; the in-progress step animates
    // with a shimmering label (AirOps-style working state).
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {live ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <CircleCheck className="size-3.5 shrink-0 text-primary/70" />
        )}
        <span className={cn(live && 'text-shimmer font-medium')}>
          {message.content}
          {live ? '…' : ''}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('text-sm', message.error && 'text-destructive')}>
      {message.error ? message.content : <Markdown>{message.content}</Markdown>}
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
  const label = matchType(meta.name, meta.type)?.label

  let sub: string
  if (checking) sub = 'reading…'
  else if (bad) sub = attachment?.reason ?? 'Could not read this file'
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
          'flex size-7 shrink-0 items-center justify-center rounded-md',
          bad
            ? 'bg-destructive/10 text-destructive'
            : status === 'ready'
              ? 'bg-primary/[0.08] text-primary'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {checking ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : bad ? (
          <TriangleAlert className="size-3.5" />
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
  agentName: string
  attachment: Attachment | null
  onPickFile: (file: File) => void
  onRemoveAttachment: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-xl border border-input bg-card shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
      {attachment && (
        <div className="px-3 pt-3">
          <FileChip attachment={attachment} onRemove={onRemoveAttachment} />
        </div>
      )}
      <textarea
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
        disabled={blocked}
        placeholder={
          blocked ? 'Choose an option above to continue' : `Message ${agentName}...`
        }
        className="max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      <div className="flex items-center justify-between px-3 pb-3">
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={running || blocked}
          aria-label="Attach a file"
          title={`Attach a file (${ACCEPTED_HINT})`}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Paperclip className="size-4.5" />
        </button>
        {running ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
