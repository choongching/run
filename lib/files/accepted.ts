// What a user can attach to a chat message. Client-safe (no server imports) so
// the composer and the upload route share one source of truth. v1 is
// text-extractable documents only; images and spreadsheets come later.

export const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB, matching the Drive ceiling

export type AcceptedType = {
  label: string
  ext: string
  mimes: string[]
}

export const ACCEPTED_TYPES: AcceptedType[] = [
  { label: 'PDF', ext: 'pdf', mimes: ['application/pdf'] },
  {
    label: 'Word',
    ext: 'docx',
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  { label: 'Text', ext: 'txt', mimes: ['text/plain'] },
  { label: 'Markdown', ext: 'md', mimes: ['text/markdown', 'text/x-markdown'] },
  { label: 'CSV', ext: 'csv', mimes: ['text/csv'] },
]

// The `accept` attribute for the file input.
export const ACCEPT_ATTR = '.pdf,.docx,.txt,.md,.csv'

// A short human list of what's allowed, shown near the paperclip.
export const ACCEPTED_HINT = 'PDF, Word, text, CSV up to 15 MB'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

// Accept by extension first (mime types are unreliable across browsers/OSes),
// falling back to the declared mime.
export function matchType(name: string, mime: string): AcceptedType | null {
  const ext = extOf(name)
  return (
    ACCEPTED_TYPES.find((t) => t.ext === ext) ??
    ACCEPTED_TYPES.find((t) => t.mimes.includes(mime)) ??
    null
  )
}

export function isAccepted(name: string, mime: string): boolean {
  return matchType(name, mime) !== null
}

// "1.2 MB", "812 KB", compact, for the chip's metadata line.
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
