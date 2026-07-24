---
name: drive-files
description: Read or write Google Drive files through the Pipedream Connect proxy. Use for any change to knowledge extraction, mission outputs, or Drive integration code.
---

# Google Drive via Pipedream for Run

Two constraints shape ALL Drive code in this repo. Both were discovered the
hard way; do not rediscover them.

1. **Domain allowlist.** The Pipedream `google_drive` app only proxies
   `www.googleapis.com`. `docs.googleapis.com` and `sheets.googleapis.com`
   return 400 "Domain not allowed", so the Docs/Sheets native APIs (including
   `batchUpdate`) are unreachable. Everything must go through the Drive v3 API.
2. **The typed SDK corrupts multipart POSTs.** The SDK proxy client hard-codes
   `contentType: "application/json"` and JSON-serializes every POST body.
   Writes that need multipart must bypass it (see Writing below).

SDK: v3, `import { PipedreamClient } from '@pipedream/sdk'` (no `/server` or
`/browser` export paths). Shared client in `lib/pipedream/client.ts`. Connect
flow: Connect Link URL from `tokens.create`, finalized via `accounts.list`.

## Reading (canonical: `lib/drive/read-file.ts`)

- The typed proxy is fine for GETs. Send `Accept: application/octet-stream` to
  switch it into binary mode; it then returns a fetch-like object, use
  `arrayBuffer()`.
- Google Docs: Drive export endpoint with `mimeType=text/plain`.
  Google Sheets: export with `mimeType=text/csv`.
- Binary downloads: `files/{id}?alt=media&supportsAllDrives=true`, then
  extract locally (`mammoth` for .docx, `pdf2json` for PDF).
- Extraction helpers never throw: unreadable files return an explanatory
  string so one bad file cannot abort a mission.

## Writing (canonical: `lib/drive/create-file.ts`)

Raw fetch to the proxy REST endpoint, verified live to forward bodies
byte-for-byte:

- URL: `https://api.pipedream.com/v1/connect/{projectId}/proxy/{base64(targetUrl)}?external_user_id=...&account_id=...`
- Headers: `Authorization: Bearer ${await pd.rawAccessToken}`,
  `x-pd-environment`, and BOTH `Content-Type` and `x-pd-proxy-Content-Type`
  set to `multipart/related; boundary=...`.
- Target: `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id`
- Multipart body: JSON metadata part + content part, CRLF line endings.
- Upload-with-conversion: metadata `mimeType: application/vnd.google-apps.document`
  with a `text/plain` body creates a real Google Doc;
  `application/vnd.google-apps.spreadsheet` with `text/csv` creates a real
  Sheet. "PDF" output is a converted Doc whose stored URL is
  `https://docs.google.com/document/d/{id}/export?format=pdf`.

## Rules

- Drive writes are best-effort: callers catch failures and fall back to
  `output_text` so a mission never loses its result.
- Proxy calls need the CONNECTING admin's ids
  (`company_settings.pipedream_connected_by` + `pipedream_account_id`), not
  the current user's.
- Before building on a new proxy capability, prove it with a small scratchpad
  probe script first (create, verify, delete); it is far cheaper than
  debugging inside the run route.
