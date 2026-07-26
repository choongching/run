// What a user can attach to a chat message. Client-safe (no server imports) so
// the composer and the upload route share one source of truth. Two kinds:
// text-extractable documents, and images the agent reads with native vision.

export const MAX_FILE_BYTES = 15 * 1024 * 1024 // documents, 15 MB
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // images, 10 MB (resized down anyway)

export type AttachmentKind = 'document' | 'image'

export type AcceptedType = {
  label: string
  ext: string
  mimes: string[]
  kind: AttachmentKind
}

export const ACCEPTED_TYPES: AcceptedType[] = [
  { label: 'PDF', ext: 'pdf', mimes: ['application/pdf'], kind: 'document' },
  {
    label: 'Word',
    ext: 'docx',
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    kind: 'document',
  },
  { label: 'Text', ext: 'txt', mimes: ['text/plain'], kind: 'document' },
  {
    label: 'Markdown',
    ext: 'md',
    mimes: ['text/markdown', 'text/x-markdown'],
    kind: 'document',
  },
  { label: 'CSV', ext: 'csv', mimes: ['text/csv'], kind: 'document' },
  { label: 'PNG', ext: 'png', mimes: ['image/png'], kind: 'image' },
  { label: 'JPEG', ext: 'jpg', mimes: ['image/jpeg'], kind: 'image' },
  { label: 'JPEG', ext: 'jpeg', mimes: ['image/jpeg'], kind: 'image' },
  { label: 'WebP', ext: 'webp', mimes: ['image/webp'], kind: 'image' },
  { label: 'GIF', ext: 'gif', mimes: ['image/gif'], kind: 'image' },
]

// The `accept` attribute for the file input.
export const ACCEPT_ATTR = '.pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif'

// A short human list of what's allowed, shown near the paperclip and drop zone.
export const ACCEPTED_HINT = 'PDF, Word, text, CSV, or an image'

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

export function kindOf(name: string, mime: string): AttachmentKind | null {
  return matchType(name, mime)?.kind ?? null
}

export function maxBytesFor(kind: AttachmentKind): number {
  return kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
}

// "1.2 MB", "812 KB", compact, for the chip's metadata line.
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
