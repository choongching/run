'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  LoaderCircle,
  Search,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DriveFile = {
  id: string
  name: string
  mimeType: string
}

type KnowledgeFile = {
  file_id: string
  file_name: string
  file_mime_type: string
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return <FileSpreadsheet className="size-4 shrink-0 stroke-[1.75] text-chart-1" />
  }
  if (
    mimeType === 'application/vnd.google-apps.document' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'text/plain'
  ) {
    return <FileText className="size-4 shrink-0 stroke-[1.75] text-chart-2" />
  }
  return <FileIcon className="size-4 shrink-0 stroke-[1.75] text-chart-4" />
}

export function AgentKnowledgeEditor({
  agentId,
  driveConnected,
}: {
  agentId: string
  driveConnected: boolean
}) {
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [pinned, setPinned] = useState<KnowledgeFile[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(driveConnected)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Serialize auto-saves: each toggle snapshots the latest selection.
  const latestPinned = useRef<KnowledgeFile[]>([])

  useEffect(() => {
    if (!driveConnected) return
    let cancelled = false
    async function load() {
      try {
        const [filesRes, knowledgeRes] = await Promise.all([
          fetch('/api/drive/files'),
          fetch(`/api/agents/${agentId}/knowledge`),
        ])
        const filesData = await filesRes.json()
        const knowledgeData = await knowledgeRes.json()
        if (!filesRes.ok) throw new Error(filesData.error ?? 'Could not load Drive files')
        if (!knowledgeRes.ok)
          throw new Error(knowledgeData.error ?? 'Could not load pinned files')
        if (cancelled) return
        setDriveFiles(filesData.files)
        setNextPageToken(filesData.next_page_token)
        setPinned(knowledgeData.files)
        latestPinned.current = knowledgeData.files
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load files')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [agentId, driveConnected])

  async function loadMore() {
    if (!nextPageToken) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/drive/files?pageToken=${encodeURIComponent(nextPageToken)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load more files')
      setDriveFiles((prev) => {
        const seen = new Set(prev.map((f) => f.id))
        return [...prev, ...data.files.filter((f: DriveFile) => !seen.has(f.id))]
      })
      setNextPageToken(data.next_page_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more files')
    } finally {
      setLoadingMore(false)
    }
  }

  const save = useCallback(
    async (files: KnowledgeFile[]) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/agents/${agentId}/knowledge`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
        // Re-sync with the server so the checkboxes reflect what is stored.
        const res = await fetch(`/api/agents/${agentId}/knowledge`)
        if (res.ok) {
          const data = await res.json()
          setPinned(data.files)
          latestPinned.current = data.files
        }
      } finally {
        setSaving(false)
      }
    },
    [agentId]
  )

  function toggle(file: KnowledgeFile, checked: boolean) {
    const without = latestPinned.current.filter((f) => f.file_id !== file.file_id)
    const next = checked ? [...without, file] : without
    latestPinned.current = next
    setPinned(next)
    save(next)
  }

  // Pinned files that fell outside the loaded Drive pages still need to be
  // visible so they can be unchecked.
  const rows = useMemo(() => {
    const listed = new Set(driveFiles.map((f) => f.id))
    const extra = pinned
      .filter((p) => !listed.has(p.file_id))
      .map((p) => ({ id: p.file_id, name: p.file_name, mimeType: p.file_mime_type }))
    const all = [...extra, ...driveFiles]
    const q = query.trim().toLowerCase()
    return q ? all.filter((f) => f.name.toLowerCase().includes(q)) : all
  }, [driveFiles, pinned, query])

  const pinnedIds = useMemo(() => new Set(pinned.map((p) => p.file_id)), [pinned])

  // Mini version of the empty-state hero: the agent page's primary action is
  // Save changes, so the connect prompt stays subtle and secondary.
  if (!driveConnected) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
            <GoogleDriveIcon className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-medium">Connect Google Drive first</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Knowledge files live in your company&apos;s Google Drive. Once it is
            connected, you can pin files here for this agent to read on every
            mission.
          </p>
          <Link
            href="/admin/integrations"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
          >
            Go to Integrations
            <ChevronRight data-icon="inline-end" />
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>Knowledge files</CardTitle>
              {pinned.length > 0 && (
                <span className="inline-flex h-5 items-center rounded-md border border-border bg-background px-1.5 text-xs text-muted-foreground">
                  {pinned.length} pinned
                </span>
              )}
            </div>
            <CardDescription>
              Pin files from your company&apos;s Google Drive for this agent to
              read on every mission. Changes save on their own.
            </CardDescription>
          </div>
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" />
              Saving
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading Drive files...
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 stroke-[1.75] text-muted-foreground" />
              <Input
                placeholder="Search files"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {rows.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                {query.trim()
                  ? 'No files match your search.'
                  : 'No supported files found in this Drive.'}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {rows.map((file) => (
                    <li key={file.id}>
                      <Label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 font-normal hover:bg-muted/50">
                        <Checkbox
                          checked={pinnedIds.has(file.id)}
                          onCheckedChange={(checked) =>
                            toggle(
                              {
                                file_id: file.id,
                                file_name: file.name,
                                file_mime_type: file.mimeType,
                              },
                              checked === true
                            )
                          }
                        />
                        <FileTypeIcon mimeType={file.mimeType} />
                        <span className="truncate text-sm">{file.name}</span>
                      </Label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {nextPageToken && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
