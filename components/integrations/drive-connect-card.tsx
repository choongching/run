'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, Copy, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 40

function MetaRow({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 px-3 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className={mono ? 'truncate font-mono text-xs' : 'truncate text-sm'}>
          {value}
        </span>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-label={`Copy ${label}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value)
                toast.success(`${label} copied.`)
              } catch {
                toast.error('Could not copy to clipboard.')
              }
            }}
          >
            <Copy />
          </Button>
        )}
      </dd>
    </div>
  )
}

export function DriveConnectCard({
  connected,
  connectedByName,
  accountId = null,
  connectorId = null,
  connectedAt = null,
  environment = 'Development',
  oauthResult = null,
}: {
  connected: boolean
  connectedByName: string | null
  accountId?: string | null
  connectorId?: string | null
  connectedAt?: string | null
  environment?: string
  oauthResult?: 'connected' | 'error' | null
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<'idle' | 'starting' | 'waiting'>('idle')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handledOauthResult = useRef(false)

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  // Pipedream redirects back here with a marker after its hosted OAuth flow.
  // This tab is freshly loaded (no polling), so finish the handshake now.
  useEffect(() => {
    if (!oauthResult || handledOauthResult.current) return
    handledOauthResult.current = true

    async function finalize() {
      // Wait a tick so the root-layout Toaster has subscribed; effects in the
      // page subtree run before the layout sibling's on a fresh load, and a
      // toast fired before subscription is silently dropped.
      await new Promise((resolve) => setTimeout(resolve, 50))
      if (oauthResult === 'error') {
        toast.error('Google Drive connection failed or was cancelled.')
      } else if (connected) {
        toast.success('Google Drive connected.')
      } else {
        try {
          const res = await fetch('/api/integrations/drive', { method: 'POST' })
          const data = await res.json()
          if (res.ok && data.connected) {
            toast.success('Google Drive connected.')
          } else {
            toast.error(
              'Could not confirm the Google Drive connection. Try reloading this page.'
            )
          }
        } catch {
          toast.error(
            'Could not confirm the Google Drive connection. Try reloading this page.'
          )
        }
      }
      // Drop the marker from the URL and re-render with fresh server state.
      router.replace('/admin/integrations')
      router.refresh()
    }
    finalize()
  }, [oauthResult, connected, router])

  function stopPolling() {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = null
    setPhase('idle')
  }

  async function handleConnect() {
    setError(null)
    setPhase('starting')
    try {
      const res = await fetch('/api/integrations/drive')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not start the connection')
      window.open(data.connect_url, '_blank', 'noopener')
      setPhase('waiting')
      poll(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the connection')
      setPhase('idle')
    }
  }

  function poll(attempt: number) {
    pollTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/integrations/drive', { method: 'POST' })
        const data = await res.json()
        if (res.ok && data.connected) {
          stopPolling()
          toast.success('Google Drive connected.')
          router.refresh()
          return
        }
      } catch {
        // Transient network failure; keep polling until attempts run out.
      }
      if (attempt + 1 >= POLL_MAX_ATTEMPTS) {
        stopPolling()
        setError(
          'Timed out waiting for Google authorization. If you finished connecting, reload this page.'
        )
        return
      }
      poll(attempt + 1)
    }, POLL_INTERVAL_MS)
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/drive', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Disconnect failed')
      setConfirmingDisconnect(false)
      setDetailsOpen(false)
      toast.success('Google Drive disconnected.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  if (!connected) {
    // Hero empty state: icon cluster, friendly why, one clear action.
    return (
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <div aria-hidden className="flex items-end">
            <div className="z-0 flex size-11 -rotate-6 translate-x-1.5 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
              <FileText className="size-5 stroke-[1.75] text-muted-foreground" />
            </div>
            <div className="z-10 flex size-12 -translate-y-1 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
              <GoogleDriveIcon className="size-5.5" />
            </div>
            <div className="z-0 flex size-11 rotate-6 -translate-x-1.5 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
              <FileSpreadsheet className="size-5 stroke-[1.75] text-muted-foreground" />
            </div>
          </div>
          <h2 className="mt-6 text-xl font-semibold">
            Google Drive isn&apos;t connected yet
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Connect your company&apos;s Google Drive so agents can read your
            shared knowledge files and save finished work back as Docs, Sheets,
            and PDFs.
          </p>
          <div className="mt-6">
            {phase === 'waiting' ? (
              <div className="flex flex-col items-center gap-3">
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Waiting for Google authorization in the other tab...
                </p>
                <Button variant="outline" size="sm" onClick={stopPolling}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={phase === 'starting'}>
                {phase === 'starting' ? 'Preparing...' : 'Connect Google Drive'}
                <ChevronRight data-icon="inline-end" />
              </Button>
            )}
          </div>
          {phase !== 'waiting' && (
            <p className="mt-3 text-xs text-muted-foreground">
              Google sign-in opens in a new tab. One admin connects once, and
              the whole team is covered.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  // Connected: the card is a clickable summary; details and disconnect live
  // in the overlay modal.
  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={() => setDetailsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setDetailsOpen(true)
          }
        }}
        className="max-w-3xl cursor-pointer transition-[box-shadow,background-color] hover:shadow-sm hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <GoogleDriveIcon className="size-4.5" />
              </div>
              <div className="grid gap-1.5">
                <CardTitle>Google Drive</CardTitle>
                <CardDescription>
                  One company-wide connection. Agents read pinned knowledge
                  files from Drive, and missions save their outputs there.
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-chart-1" />
              Connected
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end text-muted-foreground">
            <span className="inline-flex items-center gap-0.5 text-xs">
              View details
              <ChevronRight className="size-3.5 stroke-[1.75]" />
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            setConfirmingDisconnect(false)
            setError(null)
          }
        }}
      >
        <DialogContent className="gap-5 p-6 sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <GoogleDriveIcon className="size-5" />
              </div>
              <DialogTitle>Google Drive</DialogTitle>
              <span className="ml-auto inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-chart-1" />
                Connected
              </span>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList variant="line" className="border-b border-border">
              <TabsTrigger value="overview" className="after:bg-primary">
                Overview
              </TabsTrigger>
              <TabsTrigger value="connection" className="after:bg-primary">
                Connection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" keepMounted>
              <div className="grid min-h-56 content-start gap-5">
                <p className="text-sm text-muted-foreground">
                  One connection for the whole company. Pin Drive files to an
                  agent, and it reads them before every mission.
                </p>
                {/* Same label-left rhythm as the Connection tab's rows. */}
                <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-x-6 sm:gap-y-0">
                  <h3 className="text-sm font-medium sm:py-1.5">
                    What agents read
                  </h3>
                  <p className="text-sm text-muted-foreground sm:py-1.5">
                    Docs, Sheets, Word, PDF, text, and CSV files. Convert
                    Excel files to Google Sheets first.
                  </p>
                  <h3 className="mt-3 text-sm font-medium sm:mt-0 sm:py-1.5">
                    What Run keeps
                  </h3>
                  <p className="text-sm text-muted-foreground sm:py-1.5">
                    File names and ids only, never copies. Contents are read
                    fresh from Drive at mission time.
                  </p>
                  <h3 className="mt-3 text-sm font-medium sm:mt-0 sm:py-1.5">
                    Access
                  </h3>
                  <p className="text-sm text-muted-foreground sm:py-1.5">
                    Google credentials stay with Pipedream; Run never sees
                    them. Disconnecting revokes access instantly. Pinned
                    files stay listed but unreadable until you reconnect.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connection" keepMounted>
              <div className="grid min-h-56 content-start gap-2">
                <dl className="divide-y divide-border rounded-lg border border-border">
                  {accountId && (
                    <MetaRow label="Account ID" value={accountId} mono copyable />
                  )}
                  {connectorId && (
                    <MetaRow label="Connector ID" value={connectorId} mono copyable />
                  )}
                  {connectedAt && (
                    <MetaRow
                      label="Connected on"
                      value={connectedAt.slice(0, 10).replaceAll('-', '/')}
                    />
                  )}
                  {connectedByName && (
                    <MetaRow label="Connected by" value={connectedByName} />
                  )}
                  <MetaRow label="Environment" value={environment} />
                  <MetaRow label="Provider" value="Pipedream Connect" />
                </dl>
                <p className="text-xs text-muted-foreground">
                  These identifiers are safe to share with support; they grant
                  no access on their own.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="-mx-6 -mb-6 px-6 py-4">
            {confirmingDisconnect ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmingDisconnect(false)}
                  disabled={disconnecting}
                >
                  Keep connected
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                      Disconnecting...
                    </>
                  ) : (
                    'Confirm disconnect'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmingDisconnect(true)}
                >
                  Disconnect
                </Button>
                <DialogClose render={<Button variant="outline" />}>
                  Close
                </DialogClose>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
