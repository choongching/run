'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUp, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfileForm({
  initialDisplayName,
  email,
  avatarUrl,
}: {
  initialDisplayName: string
  email: string
  avatarUrl: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [savingName, setSavingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Local preview switches instantly; the sidebar catches up on refresh.
  const [preview, setPreview] = useState<string | null>(avatarUrl)

  const name = displayName.trim() || email
  const initials = name.slice(0, 2).toUpperCase()
  const nameDirty =
    displayName.trim() !== initialDisplayName && displayName.trim().length > 0

  async function saveName() {
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? `Save failed (${res.status})`)
      toast.success('Your name is saved.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your name.')
    } finally {
      setSavingName(false)
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: form,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? `Upload failed (${res.status})`)
      setPreview(body.avatar_url)
      toast.success('New picture saved.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the image.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How you appear across Run: in the sidebar and in your agent chats.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {preview && <AvatarImage src={preview} alt={name} />}
            <AvatarFallback className="bg-chart-3 text-lg font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <ImageUp data-icon="inline-start" />
              )}
              {preview ? 'Change picture' : 'Upload picture'}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, or WebP, up to 2 MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadAvatar(file)
              }}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-name">Display name</Label>
          <div className="flex gap-2">
            <Input
              id="profile-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
            />
            <Button onClick={saveName} disabled={!nameDirty || savingName}>
              {savingName && (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={email} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Your sign-in email can&apos;t be changed here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
