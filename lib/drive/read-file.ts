import { getPipedreamClient } from '@/lib/pipedream/client'

// Server-side extraction of a Drive file to plain text, called at mission run
// time for each pinned knowledge file. Never throws: unreadable files return
// an explanatory string so one bad file cannot abort a whole mission.

// A non-JSON Accept header switches the Pipedream proxy into binary mode,
// returning a fetch-like response object instead of parsed JSON.
type BinaryResponse = { arrayBuffer: () => Promise<ArrayBuffer> }

// The Pipedream google_drive app only proxies the Drive API domain
// (www.googleapis.com); docs.googleapis.com and sheets.googleapis.com are
// rejected. Google Docs and Sheets are therefore read through Drive's export
// endpoint (text/plain and text/csv) instead of their native APIs.
async function fetchAsBuffer(
  url: string,
  userId: string,
  accountId: string
): Promise<Buffer> {
  const pd = getPipedreamClient()
  const binary = (await pd.proxy.get({
    url,
    externalUserId: userId,
    accountId,
    headers: { Accept: 'application/octet-stream' },
  })) as unknown as BinaryResponse
  return Buffer.from(await binary.arrayBuffer())
}

function downloadAsBuffer(fileId: string, userId: string, accountId: string) {
  return fetchAsBuffer(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    userId,
    accountId
  )
}

function exportAsBuffer(
  fileId: string,
  exportMimeType: string,
  userId: string,
  accountId: string
) {
  return fetchAsBuffer(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
    userId,
    accountId
  )
}

export async function readDriveFile({
  fileId,
  mimeType,
  userId,
  accountId,
}: {
  fileId: string
  mimeType: string
  userId: string
  accountId: string
}): Promise<string> {
  try {
    if (mimeType === 'application/vnd.google-apps.document') {
      const buffer = await exportAsBuffer(fileId, 'text/plain', userId, accountId)
      return buffer.toString('utf-8').trim() || '(empty document)'
    }

    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const buffer = await exportAsBuffer(fileId, 'text/csv', userId, accountId)
      return buffer.toString('utf-8').trim() || '(empty sheet)'
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const buffer = await downloadAsBuffer(fileId, userId, accountId)
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim() || '(empty document)'
    }

    if (mimeType === 'application/pdf') {
      const buffer = await downloadAsBuffer(fileId, userId, accountId)
      const PDFParser = (await import('pdf2json')).default
      const text = await new Promise<string>((resolve, reject) => {
        const parser = new PDFParser(null, true)
        parser.on('pdfParser_dataReady', () => resolve(parser.getRawTextContent()))
        parser.on('pdfParser_dataError', (e: { parserError: Error } | Error) => {
          reject(e instanceof Error ? e : e.parserError)
        })
        parser.parseBuffer(buffer)
      })
      return text.trim() || '(empty PDF)'
    }

    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      const buffer = await downloadAsBuffer(fileId, userId, accountId)
      return buffer.toString('utf-8').trim() || '(empty file)'
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return '(Excel file: convert it to a native Google Sheet in Drive so its content can be read)'
    }

    return `(File type "${mimeType}" is not supported, skipped)`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `(Could not read file content: ${message})`
  }
}
