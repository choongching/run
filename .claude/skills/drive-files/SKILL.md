---
name: drive-files
description: Read Google Drive (and Gmail) through the Pipedream Connect proxy with each user's own connected account. Use for any change to the chat Drive/Gmail tools or Drive extraction code.
---

# Google Drive / Gmail via Pipedream for Run

Connections are PER-USER now (each user connects their own Gmail and Drive; the
old org-level admin connection was removed in the prompt-first revamp). The chat
tools live in `lib/tools/` (`gmail.ts`, `drive.ts`, `execute.ts`,
`definitions.ts`) and resolve the account with
`getUserConnection(supabase, userId, app)` (`lib/pipedream/connections.ts`,
reads `user_connections`). `external_user_id` for every proxy call is the
signed-in user's own uuid. Gmail is a SEPARATE Pipedream app (slug `gmail`) from
`google_drive`: separate account, scopes, and allowed domains.

Two constraints shape ALL Drive code here; do not rediscover them:

1. **Domain allowlist.** The Pipedream `google_drive` app only proxies
   `www.googleapis.com`. `docs.googleapis.com` and `sheets.googleapis.com`
   return 400 "Domain not allowed", so the Docs/Sheets native APIs (including
   `batchUpdate`) are unreachable. Everything goes through the Drive v3 API.
   The `gmail` app allows `gmail.googleapis.com` (probed live).
2. **The typed SDK corrupts multipart POSTs.** The SDK proxy client hard-codes
   `contentType: "application/json"` and JSON-serializes every POST body. Any
   future multipart write must bypass it with a raw fetch (recipe in git
   history, see below).

SDK: v3, `import { PipedreamClient } from '@pipedream/sdk'` (no `/server` or
`/browser` export paths). Shared client in `lib/pipedream/client.ts`
(`CONNECTABLE_APPS`, `GMAIL_APP_SLUG`). Per-user connect flow lives in
`app/api/connections/[app]/route.ts` (Connect Link URL from `tokens.create`,
finalized via `accounts.list`).

## Reading (canonical: `lib/drive/read-file.ts`)

Called by `lib/tools/drive.ts` with the user's own `accountId`.

- The typed proxy is fine for GETs. Send `Accept: application/octet-stream` to
  switch it into binary mode; it returns a fetch-like object, use
  `arrayBuffer()`.
- Google Docs: Drive export with `mimeType=text/plain`. Sheets: export with
  `mimeType=text/csv`.
- Binary downloads: `files/{id}?alt=media&supportsAllDrives=true`, then extract
  locally (`mammoth` for .docx, `pdf2json` for PDF).
- Extraction helpers never throw: an unreadable file returns an explanatory
  string so one bad file cannot abort a turn.

Gmail reads (`lib/tools/gmail.ts`): proxy GET `gmail.googleapis.com` messages
list + get; the body is base64url and needs decoding.

## Writing (removed; recipe in git history)

`lib/drive/create-file.ts` and `upload-file.ts` (Drive writes for mission
outputs and knowledge upload) were deleted with the mission flow. The only write
tool today is `gmail_create_draft` (`lib/tools/gmail.ts`): proxy POST to Gmail
drafts with a base64url RFC2822 body (JSON body, so the typed `proxy.post` is
safe). If Drive writes return, the verified raw-multipart recipe (base64 target
url in the proxy path, `x-pd-proxy-Content-Type`, CRLF multipart, upload-with-
conversion to native Docs/Sheets) is recoverable from git history before commit
`a5f0eb4` (Phase 5).

## Rules

- Reads are silent; writes ask first (approval gate, see chat-tools). Both run
  with the signed-in user's own account, never a shared/admin one.
- Before building on a new proxy capability, prove it with a small scratchpad
  probe script first (create, verify, delete); far cheaper than debugging
  inside the run route. Put the probe in the project dir as a dotfile and run
  with `node --env-file=.env.local`, then delete it.
