'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Ellipsis,
  FileText,
  FileUp,
  Globe,
  Loader2,
  Plus,
  StickyNote,
  TriangleAlert,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  addKnowledgeNote,
  attachKnowledge,
  deleteKnowledgeSource,
  detachKnowledge,
  renameKnowledgeSource,
} from '@/app/actions/knowledge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  budgetLabel,
  KNOWLEDGE_ACCEPT_ATTR,
  KNOWLEDGE_ACCEPTED_HINT,
  MAX_AGENT_CHARS,
  MAX_SOURCES_PER_AGENT,
} from '@/lib/knowledge/limits'

export type KnowledgeItem = {
  id: string
  title: string
  kind: 'note' | 'file'
  chars: number
  truncated: boolean
  appliesToAll: boolean
}

// A pending action that needs one deliberate confirm because the text looks
// like it holds a credential. Keeping the file around means "Save anyway" can
// resend it without asking the user to pick it again.
type PendingConfirm =
  | { type: 'file'; file: File; reason: string }
  | { type: 'note'; title: string; content: string; reason: string }

// The Knowledge group of the config panel: what this agent always knows.
//
// Sources are owned by the user and shared across their agents, so the row menu
// keeps "Detach" (this agent stops using it) clearly apart from "Delete"
// (gone from the library, every agent loses it). Everything the agent carries
// rides in its prompt on every turn, which is what the budget meter is really
// showing.
export function KnowledgeSection({
  agentId,
  sources,
  library,
  canEdit,
}: {
  agentId: string
  sources: KnowledgeItem[]
  library: KnowledgeItem[]
  // Only the agent's owner curates what it knows. A viewer of a company agent
  // still sees the list, since it explains how the agent answers, but gets no
  // controls that would fail on submit.
  canEdit: boolean
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(
    null
  )
  const [dragging, setDragging] = useState(false)

  const used = sources.reduce((sum, s) => sum + s.chars, 0)
  const pct = Math.min(100, Math.round((used / MAX_AGENT_CHARS) * 100))
  const full = sources.length >= MAX_SOURCES_PER_AGENT

  async function upload(file: File, confirmed = false) {
    setBusy(`Reading ${file.name}`)
    setConfirming(null)
    try {
      const form = new FormData()
      form.append('file', file)
      if (confirmed) form.append('confirmed', 'true')
      const res = await fetch(`/api/knowledge/${agentId}`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (data.confirm) {
        setConfirming({ type: 'file', file, reason: data.reason })
        return
      }
      if (!data.ok) {
        toast.error(data.reason ?? "We couldn't add that file.")
        return
      }
      toast.success(
        data.source.truncated
          ? `${data.source.title} added, trimmed to fit. Your next message will use it.`
          : `${data.source.title} added. Your next message will use it.`
      )
      router.refresh()
    } catch {
      toast.error("We couldn't add that file. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function saveNote(confirmed = false) {
    const title = noteTitle.trim()
    const content = noteBody.trim()
    if (!title || !content) return
    setBusy('Saving')
    setConfirming(null)
    try {
      const result = await addKnowledgeNote(agentId, {
        title,
        content,
        confirmed,
      })
      if (!result.ok && 'confirm' in result) {
        setConfirming({ type: 'note', title, content, reason: result.reason })
        return
      }
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      setNoteOpen(false)
      setNoteTitle('')
      setNoteBody('')
      toast.success(`${title} added. Your next message will use it.`)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  // One shape for the row actions and the library picker: run it, surface the
  // reason if it fails, refresh if it worked.
  async function run(label: string, fn: () => Promise<{ ok: boolean; reason?: string }>) {
    setBusy(label)
    try {
      const result = await fn()
      if (!result.ok) {
        toast.error(result.reason ?? 'That did not work. Please try again.')
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* The budget is the honest headline: this is what the agent carries on
          every message, not how much storage is left. */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-md bg-muted">
          <div
            className="h-full rounded-md bg-primary transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {sources.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {`${budgetLabel(used)}, ${sources.length} of ${MAX_SOURCES_PER_AGENT} sources.`}
          </p>
        )}
      </div>

      {sources.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                {s.kind === 'file' ? (
                  <FileText className="size-3.5" />
                ) : (
                  <StickyNote className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {renaming?.id === s.id ? (
                  <input
                    autoFocus
                    value={renaming.title}
                    onChange={(e) =>
                      setRenaming({ id: s.id, title: e.target.value })
                    }
                    onBlur={() => setRenaming(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenaming(null)
                      if (e.key === 'Enter') {
                        const title = renaming.title
                        setRenaming(null)
                        void run('Renaming', () =>
                          renameKnowledgeSource(s.id, title)
                        )
                      }
                    }}
                    aria-label="Source name"
                    className="w-full rounded-lg border border-input bg-card px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                ) : (
                  <>
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.appliesToAll ? 'On every agent' : s.kind === 'file' ? 'File' : 'Note'}
                      {', '}
                      {s.chars.toLocaleString()} characters
                      {s.truncated ? ', trimmed to fit' : ''}
                    </p>
                  </>
                )}
              </div>
              {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label={`Actions for ${s.title}`}
                    />
                  }
                >
                  <Ellipsis className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setRenaming({ id: s.id, title: s.title })}
                  >
                    Rename
                  </DropdownMenuItem>
                  {/* A source that applies to every agent is not attached to
                      this one, so detaching it here would appear to do nothing.
                      It is turned off from the Knowledge page, where the choice
                      was made. */}
                  {s.appliesToAll ? (
                    <DropdownMenuItem render={<Link href="/knowledge" />}>
                      <Globe className="size-3.5" />
                      Manage on the Knowledge page
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        void run('Detaching', () =>
                          detachKnowledge(agentId, s.id)
                        )
                      }
                    >
                      <Unlink className="size-3.5" />
                      Detach from this agent
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      void run('Deleting', () => deleteKnowledgeSource(s.id))
                    }
                  >
                    Delete from library
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      )}

      {!canEdit && (
        <p className="px-0.5 text-xs text-muted-foreground">
          This agent belongs to someone else, so only they can change what it
          knows.
        </p>
      )}

      {canEdit && noteOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <input
            autoFocus
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Name it, for example How I write emails"
            maxLength={120}
            aria-label="Note name"
            className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={5}
            placeholder="Paste a writing sample, house style rules, product facts, or anything it should always know."
            aria-label="Note content"
            className="min-h-24 resize-y text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNoteOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void saveNote()}
              disabled={!noteTitle.trim() || !noteBody.trim() || busy !== null}
            >
              Save note
            </Button>
          </div>
        </div>
      )}

      {/* Saving something that looks like a credential takes one deliberate
          tap, because knowledge is re-sent on every message. Rendered directly
          under whatever triggered it, so the warning is never off-screen above
          the button the user just pressed. */}
      {confirming && (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/25 bg-card p-3">
          <div className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">{confirming.reason}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (confirming.type === 'file') void upload(confirming.file, true)
                else void saveNote(true)
              }}
            >
              Save anyway
            </Button>
          </div>
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-1.5 px-0.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {busy}
        </p>
      )}

      {/* The drop zone is a real button, so it is also the click-to-browse
          path and keyboard users reach it like any control. Dashed, like every
          "something goes here" surface in the app. */}
      {canEdit && (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={full || busy !== null}
          onDragOver={(e) => {
            e.preventDefault()
            if (!full && busy === null) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (full || busy !== null) return
            const file = e.dataTransfer.files?.[0]
            if (file) void upload(file)
          }}
          className={`flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <FileUp className="mb-1 size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drag a file here, or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            {KNOWLEDGE_ACCEPTED_HINT}, up to 15&nbsp;MB
          </span>
        </button>
      )}
      {canEdit && (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNoteOpen(true)}
          disabled={full || busy !== null || noteOpen}
        >
          <Plus className="size-3.5" />
          Add note
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={KNOWLEDGE_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void upload(file)
          }}
        />
      </div>
      )}

      {canEdit && library.length > 0 && !full && (
        <Select
          value=""
          onValueChange={(v) => {
            if (v) void run('Attaching', () => attachKnowledge(agentId, v))
          }}
        >
          <SelectTrigger className="w-full" aria-label="Add from your library">
            <SelectValue>{() => 'Add from your library'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {library.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {canEdit && (
        <p className="px-0.5 text-xs text-muted-foreground">
          {full
            ? `This agent is at its limit of ${MAX_SOURCES_PER_AGENT} sources. Detach one to add another.`
            : 'Long files are trimmed to fit.'}
        </p>
      )}
    </div>
  )
}
