'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Ellipsis, FileText, Globe, Loader2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteKnowledgeSource,
  renameKnowledgeSource,
  setKnowledgeScope,
} from '@/app/actions/knowledge'
import { KnowledgeIcon } from '@/components/nav-icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MAX_LIBRARY_SOURCES } from '@/lib/knowledge/limits'

export type LibrarySource = {
  id: string
  title: string
  kind: 'note' | 'file'
  chars: number
  truncated: boolean
  appliesToAll: boolean
  usedBy: { id: string; name: string }[]
}

export function KnowledgeLibrary({
  items,
  totalChars,
}: {
  items: LibrarySource[]
  totalChars: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(
    null
  )
  // Kept after close so the dialog keeps its content through the exit animation.
  const [target, setTarget] = useState<LibrarySource | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function remove() {
    if (!target) return
    setBusy(target.id)
    try {
      const result = await deleteKnowledgeSource(target.id)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      setConfirmOpen(false)
      toast(`${target.title} deleted.`)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  // A source that applies everywhere is the whole point of a library: one
  // voice guide that stays right on every agent when you edit it once.
  async function setScope(s: LibrarySource, appliesToAll: boolean) {
    setBusy(s.id)
    try {
      const result = await setKnowledgeScope(s.id, appliesToAll)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      toast(
        appliesToAll
          ? `${s.title} now applies to every agent.`
          : `${s.title} now applies only where it is attached.`
      )
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function rename(id: string, title: string) {
    setBusy(id)
    try {
      const result = await renameKnowledgeSource(id, title)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <span className="mb-5 flex size-11 items-center justify-center rounded-lg border border-border bg-background">
          <KnowledgeIcon className="size-5 text-muted-foreground" />
        </span>
        <h2 className="text-xl font-semibold">Nothing in your library yet</h2>
        <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
          Knowledge is what an agent always knows: how you write, the facts you
          repeat, the words your team uses. Open any agent, go to Configure, and
          add a note or a file. It will show up here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">
          {items.length} {items.length === 1 ? 'source' : 'sources'}
        </span>
        <span className="text-sm text-muted-foreground">
          {totalChars.toLocaleString()} characters, {MAX_LIBRARY_SOURCES} allowed
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              {s.kind === 'file' ? (
                <FileText className="size-4" />
              ) : (
                <StickyNote className="size-4" />
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
                      void rename(s.id, title)
                    }
                  }}
                  aria-label="Source name"
                  className="w-full max-w-sm rounded-lg border border-input bg-card px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              ) : (
                <p className="truncate text-sm font-medium">{s.title}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {s.kind === 'file' ? 'File' : 'Note'}
                {', '}
                {s.chars.toLocaleString()} characters
                {s.truncated ? ', trimmed to fit' : ''}
              </p>
            </div>

            {/* Which agents carry this. An unused source is the case this page
                exists for, so it gets said plainly rather than left blank. */}
            <div className="hidden min-w-0 max-w-xs flex-1 flex-wrap items-center gap-1.5 sm:flex">
              {s.appliesToAll ? (
                <span className="flex h-6 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium">
                  <Globe className="size-3" />
                  Every agent
                </span>
              ) : s.usedBy.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Not used by any agent
                </span>
              ) : (
                s.usedBy.map((a) => (
                  <Link
                    key={a.id}
                    href={`/chat/${a.id}`}
                    className="flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {a.name}
                  </Link>
                ))
              )}
            </div>

            {busy === s.id ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Actions for ${s.title}`}
                    />
                  }
                >
                  <Ellipsis className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => void setScope(s, !s.appliesToAll)}
                  >
                    {s.appliesToAll
                      ? 'Use only where attached'
                      : 'Use with every agent'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRenaming({ id: s.id, title: s.title })}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setTarget(s)
                      setConfirmOpen(true)
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {target?.title}?</DialogTitle>
            <DialogDescription>
              {target?.appliesToAll
                ? 'Every agent you have uses this. They will all stop knowing it. This cannot be undone.'
                : target && target.usedBy.length > 0
                ? `${target.usedBy.length === 1 ? 'One agent uses' : `${target.usedBy.length} agents use`} this: ${target.usedBy
                    .map((a) => a.name)
                    .join(', ')}. They will stop knowing it. This cannot be undone.`
                : 'No agent is using this. It will be gone for good.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={busy !== null}
            >
              {busy !== null && <Loader2 className="size-3.5 animate-spin" />}
              {busy !== null ? 'Deleting' : 'Delete source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
