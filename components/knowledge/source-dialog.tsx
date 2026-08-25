'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Globe, Loader2 } from 'lucide-react'

import { readKnowledgeSource } from '@/app/actions/knowledge'
import { AgentsIcon } from '@/components/nav-icons'
import { RowBox } from '@/components/section-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LibrarySource } from '@/components/knowledge/knowledge-library'

// One source, opened.
//
// The row can hold three facts and no more, and the questions people actually
// have about a source are provenance ones: who is using this, where did it
// come from, when. A dialog rather than a drawer, because that is the shape a
// record already opens in here (the routine's details, founder's call after
// seeing both).
//
// Read-only on purpose. Everything that CHANGES a source is one click away in
// the row's menu, and a details view that also edits is two surfaces disagreeing
// about which one saved.

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Bytes as a person says them. Only files have a size in bytes; a note's size
// is its characters, which the row already carries.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// A label and its value, one per line. Not a RowBox row: these are facts about
// one thing rather than a list of things, and the two-column shape is what
// makes them scannable as a set.
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2.5">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-sm">{children}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm font-medium">{children}</p>
}

export function SourceDialog({
  source,
  open,
  onOpenChange,
}: {
  // Kept after close so the dialog holds its content through the exit
  // animation (the styleguide's overlay rule).
  source: LibrarySource | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full screen below md, the mobile rule for any surface this size. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-lg">
        {source ? <Body key={source.id} source={source} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Body({ source }: { source: LibrarySource }) {
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  // The text is fetched when the source opens rather than shipped with the
  // list; see readKnowledgeSource.
  useEffect(() => {
    let live = true
    void readKnowledgeSource(source.id).then((result) => {
      if (!live) return
      if (result.ok) setText(result.content)
      else setFailed(true)
    })
    return () => {
      live = false
    }
  }, [source.id])

  const origin = source.file

  return (
    <>
      {/* pr-12 clears the close button. */}
      <DialogHeader className="gap-1 border-b border-border p-5 pr-12">
        <DialogTitle className="text-base">{source.title}</DialogTitle>
        <DialogDescription>
          {source.kind === 'file' ? 'File' : 'Note'} ·{' '}
          {source.chars.toLocaleString()} characters
          {source.truncated ? ' · trimmed to fit' : ''}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto p-5">
        <section>
          <SectionLabel>Used by</SectionLabel>
          {source.appliesToAll ? (
            <RowBox>
              <div className="flex items-center gap-2.5 px-3.5 py-3 text-sm">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                Every agent, including any you make later
              </div>
            </RowBox>
          ) : source.usedBy.length === 0 ? (
            // The orphan case, said plainly: this is the state the library
            // page exists to make visible.
            <RowBox>
              <p className="px-3.5 py-3 text-sm text-muted-foreground">
                No agent is using this. Attach it from an agent&rsquo;s
                Configure panel, or switch it on for every agent.
              </p>
            </RowBox>
          ) : (
            <RowBox list>
              {source.usedBy.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/chat/${a.id}`}
                    className="run-focus-fade flex items-center gap-2.5 px-3.5 py-3 text-sm hover:bg-muted/40"
                  >
                    <AgentsIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </RowBox>
          )}
        </section>

        <section className="mt-5">
          <SectionLabel>About</SectionLabel>
          <RowBox>
            <Fact label="Added">{formatDate(source.createdAt)}</Fact>
            <Fact label="Last changed">{formatDate(source.updatedAt)}</Fact>
            {/* Where it came from, which stays true after it is detached
                everywhere. Null for a source made before we recorded it, or
                one whose agent has since been deleted; the line then goes
                rather than guessing. */}
            {source.addedIn ? (
              <Fact label="Added in">
                <Link
                  href={`/chat/${source.addedIn.id}`}
                  className="run-focus-fade inline-flex items-center gap-1.5 hover:underline"
                >
                  <AgentsIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  {source.addedIn.name}
                </Link>
              </Fact>
            ) : null}
            {origin ? (
              <>
                <Fact label="Original file">
                  <span className="block truncate">{origin.name}</span>
                </Fact>
                <Fact label="File size">{formatBytes(origin.size)}</Fact>
              </>
            ) : null}
          </RowBox>
        </section>

        <section className="mt-5">
          <SectionLabel>What it says</SectionLabel>
          {/* The text an agent actually carries, verbatim. A file's source is
              its extracted text, not the original document, so this is the
              only place to see what was really kept. */}
          <div className="rounded-lg border border-border px-3.5 py-3">
            {text !== null ? (
              <p className="max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
                {text}
              </p>
            ) : failed ? (
              <p className="text-sm text-muted-foreground">
                We could not read this one. Close and try again.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Reading
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
