'use client'

import { useRef, useState } from 'react'
import { ArrowUp, Loader2, Square } from 'lucide-react'
import { StickToBottom } from 'use-stick-to-bottom'

import { ConnectCard } from '@/components/chat/connect-card'
import { Markdown } from '@/components/chat/markdown'
import { cn } from '@/lib/utils'

type ChatRole = 'user' | 'agent' | 'activity'

export type ChatMessage = {
  id: string | number
  role: ChatRole
  content: string
  error?: boolean
}

type Draft = { text: string; phase: 'thinking' | 'streaming' } | null

type Frame =
  | { type: 'start' }
  | { type: 'thinking' }
  | { type: 'delta'; text: string }
  | { type: 'activity'; label: string }
  | { type: 'connect'; app: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

export function ChatThread({
  agentId,
  agentName,
  initialMessages,
}: {
  agentId: string
  agentName: string
  initialMessages: ChatMessage[]
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState<Draft>(null)
  const [running, setRunning] = useState(false)
  const [input, setInput] = useState('')
  const [connectApp, setConnectApp] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Local ids for optimistic rows; DB ids replace them on reload.
  const tempId = useRef(-1)

  async function send() {
    const text = input.trim()
    if (!text || running) return

    setInput('')
    setRunning(true)
    setConnectApp(null)
    setMessages((prev) => [
      ...prev,
      { id: tempId.current--, role: 'user', content: text },
    ])
    setDraft({ text: '', phase: 'thinking' })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/chat/${agentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })

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
    } catch (err) {
      if (controller.signal.aborted) {
        // User stopped: keep whatever streamed so far as the agent's reply.
        commitDraft()
      } else {
        finishWithError(
          err instanceof Error ? err.message : 'The connection dropped.'
        )
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
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
      case 'done':
        setMessages((prev) => [
          ...prev,
          { id: tempId.current--, role: 'agent', content: frame.text },
        ])
        setDraft(null)
        return
      case 'error':
        finishWithError(frame.message)
        return
    }
  }

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

  function stop() {
    abortRef.current?.abort()
  }

  const isEmpty = messages.length === 0 && !draft

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StickToBottom
        className="relative min-h-0 flex-1 overflow-y-auto"
        resize="smooth"
        initial="instant"
      >
        <StickToBottom.Content className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 py-6">
          {isEmpty && (
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
        </StickToBottom.Content>
      </StickToBottom>

      <div className="mx-auto w-full max-w-3xl px-1 pb-2">
        <Composer
          value={input}
          onChange={setInput}
          onSend={send}
          onStop={stop}
          running={running}
          agentName={agentName}
        />
      </div>
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
        <div className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-muted px-3.5 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.role === 'activity') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {live ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        )}
        <span>{message.content}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'text-sm',
        message.error && 'text-destructive'
      )}
    >
      {message.error ? message.content : <Markdown>{message.content}</Markdown>}
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
  running,
  agentName,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  running: boolean
  agentName: string
}) {
  const canSend = value.trim().length > 0 && !running

  return (
    <div className="rounded-xl border border-input bg-card shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (canSend) onSend()
          }
        }}
        rows={1}
        placeholder={`Message ${agentName}...`}
        className="max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-end px-3 pb-3">
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
