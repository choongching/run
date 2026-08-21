'use client'

import { createContext, useContext } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { SourceFavicon } from '@/components/chat/source-favicon'
import { domainLabel } from '@/lib/favicon'
import type { MessageSource } from '@/lib/chat/sources'

// What a reply remembers about where it came from, made available to the chips
// inside it.
//
// A chip is rendered deep inside react-markdown, from a link in the model's
// prose, so it has no way to reach the message it belongs to. Context is the
// seam: the message row provides its stored sources, and any chip below can ask
// whether the page it points at is one of them.
//
// Empty is the normal case, not an error. Most replies involve no search at
// all, and every reply written before we started storing sources has none.
const EMPTY: MessageSource[] = []
const SourcesContext = createContext<MessageSource[]>(EMPTY)

export function SourcesProvider({
  sources,
  children,
}: {
  sources?: MessageSource[]
  children: React.ReactNode
}) {
  return (
    <SourcesContext.Provider value={sources ?? EMPTY}>
      {children}
    </SourcesContext.Provider>
  )
}

export function useSources() {
  return useContext(SourcesContext)
}

// Which stored source a chip's link is, if it is one at all.
//
// Exact url first, host second. The model writes the url back from what the
// search gave it, so exact matching works most of the time, but it drops a
// tracking parameter or adds a trailing slash often enough that host is a
// useful second pass.
//
// Returns -1 for no match, and that is a real answer rather than a fallback:
// showing the first stored page under a chip pointing somewhere else would put
// the wrong title on the wrong claim, which is worse than showing nothing.
export function findSource(sources: MessageSource[], href: string): number {
  if (!sources.length) return -1
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return -1
  }
  url.hash = ''
  const exact = url.toString()
  const byUrl = sources.findIndex((s) => s.url === exact)
  if (byUrl !== -1) return byUrl
  return sources.findIndex((s) => {
    try {
      return new URL(s.url).hostname === url.hostname
    } catch {
      return false
    }
  })
}

// The card behind a chip: what this page is, and a way through the others.
//
// THE ONE THING THIS MUST NOT DO IS COUNT. What we store is what the agent's
// searches RETURNED, not what its answer used, and the two differ in practice:
// one real turn stored five pages and wrote from four. So there is no "1 of 5",
// no dots, no total anywhere on this card. The arrows simply stop at the ends,
// the way an unlabelled carousel does, and the heading says the only thing that
// is true of all of them: these are the pages behind the answer.
export function SourcePopover({
  sources,
  index,
  onIndex,
}: {
  sources: MessageSource[]
  index: number
  onIndex: (next: number) => void
}) {
  const source = sources[index]
  if (!source) return null

  let host: string
  try {
    host = new URL(source.url).hostname
  } catch {
    return null
  }

  const many = sources.length > 1
  const published = source.publishedAt ? formatDate(source.publishedAt) : ''

  return (
    // not-prose for the same reason the chip carries it: this hangs off a link
    // inside the reply's typography container, which would otherwise underline
    // it, resize the text and add its own paragraph margins.
    <div className="not-prose w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="truncate text-[11px] text-muted-foreground">
          Pages behind this answer
        </p>
        {many && (
          // At the trailing edge and tight together, both founder calls. A wide
          // box around a small glyph reads as two unrelated buttons; these sit
          // close enough to read as one control with two ends.
          <div className="-mr-1 flex shrink-0 items-center">
            <ArrowButton
              label="Previous"
              disabled={index === 0}
              onClick={() => onIndex(index - 1)}
            >
              <ChevronLeft className="size-3.5" strokeWidth={2} />
            </ArrowButton>
            <ArrowButton
              label="Next"
              disabled={index === sources.length - 1}
              onClick={() => onIndex(index + 1)}
            >
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </ArrowButton>
          </div>
        )}
      </div>

      {/* The whole body is the link, so the card keeps the promise its cursor
          makes. The arrows stay outside it: a button inside an anchor is
          invalid, and this is the shape that avoids it. */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 py-2.5 no-underline transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-1.5">
          <SourceFavicon host={host} px={14} />
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {domainLabel(host)}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">
          {source.title || host}
        </p>
        {source.snippet && (
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {source.snippet}
          </p>
        )}
        {published && (
          // A real date where Perplexity puts a "Trusted" badge. We have no
          // basis to issue a verdict on a page. We do know when it was
          // published, and that is a fact a reader can use.
          <p className="mt-1.5 text-[11px] text-muted-foreground">{published}</p>
        )}
      </a>
    </div>
  )
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

// An unparseable date shows as nothing rather than as "Invalid Date".
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
