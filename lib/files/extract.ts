import { matchType } from '@/lib/files/accepted'

// Extract an uploaded file to plain text, server-side. The point is honesty:
// we distinguish "readable text" from "transferred but empty" (a scanned PDF,
// an image-only doc) so the composer can tell the user before a turn is spent,
// instead of sending the model a blank file that looks fine.

// Cap the inlined text so one huge file cannot blow the turn's context. Most
// documents are far under this; longer files are truncated with a note.
const MAX_CHARS = 120_000

export type ExtractResult =
  | { ok: true; text: string; chars: number; truncated: boolean }
  | { ok: false; reason: string }

async function extractPdf(buffer: Buffer): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, true)
    parser.on('pdfParser_dataReady', () =>
      resolve(parser.getRawTextContent())
    )
    parser.on('pdfParser_dataError', (e: { parserError: Error } | Error) => {
      reject(e instanceof Error ? e : e.parserError)
    })
    parser.parseBuffer(buffer)
  })
}

// A plain-language reason a readable file came back empty, so the user knows
// what to try instead. No apologies, just the fix.
function emptyReason(ext: string): string {
  if (ext === 'pdf') {
    return "This looks like a scanned PDF with no selectable text. Try a text-based PDF or a Word or text file."
  }
  return "We couldn't find any text in this file. It may be empty or image-only."
}

export async function extractFile(
  buffer: Buffer,
  filename: string,
  mime: string
): Promise<ExtractResult> {
  const matched = matchType(filename, mime)
  if (!matched) {
    return { ok: false, reason: "That file type isn't supported yet." }
  }

  let text: string
  try {
    if (matched.ext === 'pdf') {
      text = await extractPdf(buffer)
    } else if (matched.ext === 'docx') {
      const mammoth = await import('mammoth')
      text = (await mammoth.extractRawText({ buffer })).value
    } else {
      // txt, md, csv
      text = buffer.toString('utf-8')
    }
  } catch {
    return {
      ok: false,
      reason:
        "We couldn't read this file. It may be password-protected or corrupted.",
    }
  }

  text = text.trim()
  if (!text) {
    return { ok: false, reason: emptyReason(matched.ext) }
  }

  const truncated = text.length > MAX_CHARS
  if (truncated) {
    text =
      text.slice(0, MAX_CHARS) +
      '\n\n[... truncated: the file was longer than can be read in one message.]'
  }
  return { ok: true, text, chars: text.length, truncated }
}
