'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'

import { renameAgent } from '@/app/actions/agents'

// The chat header doubles as an inline rename control: click the name (or its
// pencil) to edit, Enter or blur to save, Escape to cancel. The name is saved
// optimistically and reverts if the server action fails. Keyed by agentId at
// the page so switching agents re-seeds the name.
export function ChatHeader({
  agentId,
  agentName,
}: {
  agentId: string
  agentName: string
}) {
  const router = useRouter()
  const [name, setName] = useState(agentName)
  const [draft, setDraft] = useState(agentName)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(name)
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  async function commit() {
    setEditing(false)
    const next = draft.trim().replace(/\s+/g, ' ')
    if (!next || next === name) {
      setDraft(name)
      return
    }
    setName(next)
    try {
      await renameAgent(agentId, next)
      router.refresh()
    } catch {
      setName(agentName)
      setDraft(agentName)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setDraft(name)
          }
        }}
        maxLength={60}
        aria-label="Agent name"
        className="w-full max-w-sm rounded-lg border border-input bg-card px-2 py-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      aria-label="Rename agent"
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-lg font-semibold">{name}</h1>
      <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
