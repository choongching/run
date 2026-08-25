'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Ellipsis, FileText, Globe, Loader2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteKnowledgeSource,
  renameKnowledgeSource,
  setKnowledgeScope,
} from '@/app/actions/knowledge'
import { SourceDialog } from '@/components/knowledge/source-dialog'
import { AgentsIcon, KnowledgeIcon } from '@/components/nav-icons'
import {
  Row,
  RowBox,
  RowTile,
  SectionCard,
  SectionCount,
} from '@/components/section-card'
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
  createdAt: string
  updatedAt: string
  // The agent it was created in, which is not the same question as who uses
  // it now: detach a source everywhere and this is still where it came from.
  // Null for a source made before we recorded it, or whose agent is gone.
  addedIn: { id: string; name: string } | null
  // A file source's original document. Notes have none.
  file: { name: string; size: number } | null
}

const noop = () => () => {}

// Dates render only after mount, in the viewer's timezone rather than the
// server's (the same rule the chat thread and the routines list follow).
function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

// The list is ordered by when each source last changed, so the row says so.
// Day and month, and the year only when it is not this one: "21 Aug" is what
// someone actually wants to know about a note they edited last week.
function formatUpdated(iso: string): string {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

// A source's title inside a sentence. Notes are usually titled with a whole
// sentence, full stop and all ("Always use emojis in your titles."), and the
// toasts read it straight into their own: "Always use emojis in your titles.
// now applies only where it is attached." Quotes mark where the borrowed text
// stops, and the trailing full stop goes because the sentence has its own.
function quoted(title: string): string {
  return `\u201C${title.replace(/[.\u2026]+$/, '')}\u201D`
}

// The separator between a row's facts. A middle dot rather than a comma: the
// three parts are unrelated facts, not a list of one kind of thing.
function Dot() {
  return (
    <span aria-hidden className="px-1 text-muted-foreground/50">
      ·
    </span>
  )
}

// What this source reaches, in words, for the detail line. Three states, and
// the third is why this page exists: an orphaned source can be reached from
// nowhere else.
function scopeWords(source: LibrarySource): string {
  if (source.appliesToAll) return 'Every agent'
  if (source.usedBy.length === 0) return 'Not used yet'
  if (source.usedBy.length === 1) return `Used by ${source.usedBy[0].name}`
  return `Used by ${source.usedBy.length} agents`
}

// The same fact as a chip at the row's trailing edge, where the column lines
// up down the list. Desktop only: a phone row is 326px wide, and a chip that
// can run to 9rem of it leaves the name nowhere to go, so below sm the words
// ride the detail line instead (which wraps) and the chip stands down.
function Scope({ source }: { source: LibrarySource }) {
  const chip =
    'hidden h-6 max-w-[9rem] items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground sm:flex [&_svg]:size-3 [&_svg]:shrink-0'

  if (source.appliesToAll) {
    return (
      <span className={chip}>
        <Globe />
        Every agent
      </span>
    )
  }

  if (source.usedBy.length === 0) {
    return (
      <span className="hidden text-xs text-muted-foreground/70 sm:block">
        Not used yet
      </span>
    )
  }

  // One agent gets its name and a way to it. Several would wrap the row into
  // a paragraph of chips, so they get counted, with the names in the label
  // for anyone the hover title does not reach.
  if (source.usedBy.length === 1) {
    const a = source.usedBy[0]
    return (
      <Link
        href={`/chat/${a.id}`}
        className={`${chip} run-focus-fade hover:text-foreground`}
      >
        <AgentsIcon />
        <span className="truncate">{a.name}</span>
      </Link>
    )
  }

  const names = source.usedBy.map((a) => a.name).join(', ')
  return (
    <span className={chip} title={names} aria-label={`Used by ${names}`}>
      <AgentsIcon />
      {source.usedBy.length} agents
    </span>
  )
}

export function KnowledgeLibrary({
  items,
}: {
  items: LibrarySource[]
}) {
  const router = useRouter()
  const mounted = useMounted()
  const [busy, setBusy] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(
    null
  )
  // Kept after close so the dialog keeps its content through the exit animation.
  const [target, setTarget] = useState<LibrarySource | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Same pattern for the details view: the source outlives the close so the
  // dialog keeps its content through the exit animation.
  const [opened, setOpened] = useState<LibrarySource | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

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
      toast(`${quoted(target.title)} deleted.`)
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
          ? `${quoted(s.title)} now applies to every agent.`
          : `${quoted(s.title)} now applies only where it is attached.`
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
      // The card stays when the library is empty, so the page keeps its shape.
      // No heading on it: the page title already says Knowledge.
      <SectionCard>
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-12 text-center">
        <span className="mb-5 flex size-11 items-center justify-center rounded-lg border border-border bg-background">
          <KnowledgeIcon className="size-5 text-muted-foreground" />
        </span>
        {/* One step below the page title, the same level as a card title, so
            the page keeps a single loudest voice: Knowledge, then this, then
            the one-line how. */}
        <h2 className="text-base font-medium">Nothing in your library yet</h2>
        {/* One job: how to get something here. Said the way a person would,
            not the way the system is built: no panel names. */}
        <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
          Add notes or files to any of your agents. They all end up here.
        </p>
      </div>
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard
        // The count carries the limit, the way every other section carries
        // its count. The old prose said "33 characters, 50 allowed", which
        // read as a fifty-CHARACTER cap; 50 is how many sources you may keep,
        // so the number now sits beside the only thing it counts.
        title={
          <>
            Your library
            <SectionCount>
              {items.length} of {MAX_LIBRARY_SOURCES}
            </SectionCount>
          </>
        }
      >
      <RowBox list>
        {items.map((s) => (
          <Row
            item
            key={s.id}
            // The whole row opens the details. The provenance questions (who
            // uses this, where did it come from) have nowhere to live on a
            // 60px line, and a row that holds a name and no door is a dead
            // end. The menu inside stops the click from reaching this.
            className="run-focus-fade cursor-pointer hover:bg-muted/40"
            onClick={() => {
              setOpened(s)
              setDetailsOpen(true)
            }}
            lead={
              <RowTile>
                {s.kind === 'file' ? (
                  <FileText className="size-4" />
                ) : (
                  <StickyNote className="size-4" />
                )}
              </RowTile>
            }
            title={
              renaming?.id === s.id ? (
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
                  onClick={(e) => e.stopPropagation()}
                  // Full width of the name slot, not max-w-sm. The field is
                  // editing the line it sits on, so it should be that line's
                  // size; a short box mid-row read as a different control.
                  className="run-focus-fade w-full rounded-md border border-input bg-card px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10"
                />
              ) : (
                <span className="min-w-0 truncate">{s.title}</span>
              )
            }
            // The row's own facts, in one line that reads left to right from
            // what it is to how big to when it changed. The list is sorted by
            // that last one, so leaving it off left the order unexplained.
            detail={
              <>
                {s.kind === 'file' ? 'File' : 'Note'}
                <Dot />
                {s.chars.toLocaleString()} characters
                {s.truncated ? ', trimmed to fit' : ''}
                {/* The chip's fact, for the width the chip stands down at. */}
                <span className="sm:hidden">
                  <Dot />
                  {scopeWords(s)}
                </span>
                {mounted ? (
                  <>
                    <Dot />
                    Updated {formatUpdated(s.updatedAt)}
                  </>
                ) : null}
              </>
            }
            trailing={
              <span
                className="flex items-center gap-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Who carries this source. It used to sit in a flex-1 block
                    of its own mid-row, which left a ragged gap between the
                    name and the chip and put the chip in a different place on
                    every row; at the trailing edge the whole column lines up.
                    It was also hidden below sm, so a phone could not see the
                    one thing this page is for. */}
                <Scope source={s} />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="run-tap text-muted-foreground"
                        // Kept mounted while busy so the row does not resize
                        // under the pointer mid-action; the spinner takes the
                        // icon's place inside the same button.
                        disabled={busy === s.id}
                        aria-label={`Actions for ${s.title}`}
                      />
                    }
                  >
                    {busy === s.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Ellipsis className="size-4" />
                    )}
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
              </span>
            }
          />
        ))}
      </RowBox>
      </SectionCard>

      <SourceDialog
        source={opened}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {target ? quoted(target.title) : 'this source'}?
            </DialogTitle>
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
