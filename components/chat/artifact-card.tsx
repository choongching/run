'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Download, FileText } from 'lucide-react'

import { Markdown } from '@/components/chat/markdown'
import { cn } from '@/lib/utils'

export type ArtifactMeta = {
  title: string
  format: 'markdown'
  content: string
}

// A safe, readable filename from the document title.
function filename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'document'}.md`
}

// A document the agent produced, shown in the thread as a card: title, a
// collapsible preview, and a Download button that saves the Markdown file. The
// artifact lives in the message payload, so it survives a reload.
export function ArtifactCard({ artifact: raw }: { artifact: ArtifactMeta }) {
  const [open, setOpen] = useState(false)
  // New documents are cleaned of <cite> markup at creation (see
  // summarizeDocument), but documents stored before that fix carry the tags in
  // their saved payload, so the card cleans again on the way out. Covers the
  // preview and the downloaded file alike. Memoized because the thread
  // re-renders this card on every streaming frame, and regexing a long
  // document per frame is wasted work.
  const artifact = useMemo(
    () => ({
      ...raw,
      title: raw.title.replace(/<\/?cite\b[^>]*>/g, ''),
      content: raw.content.replace(/<\/?cite\b[^>]*>/g, ''),
    }),
    [raw]
  )

  function download() {
    const blob = new Blob([artifact.content], {
      type: 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename(artifact.title)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <FileText className="size-4.5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{artifact.title}</p>
          <p className="text-xs text-muted-foreground">Markdown document</p>
        </div>
        <button
          type="button"
          onClick={download}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80"
        >
          <Download className="size-3.5" />
          Download
        </button>
      </div>
      {artifact.content && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform',
                open && 'rotate-180'
              )}
            />
            {open ? 'Hide preview' : 'Show preview'}
          </button>
          {open && (
            <div className="max-h-96 overflow-y-auto border-t border-border px-4 py-3 text-sm">
              <Markdown>{artifact.content}</Markdown>
            </div>
          )}
        </>
      )}
    </div>
  )
}
