import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'An image file is required' }, { status: 400 })
  }
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Use a PNG, JPEG, or WebP image' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Keep the image under 2 MB' },
      { status: 400 }
    )
  }

  // One file per user, always the same path; upsert replaces the old one.
  // Storage policies restrict writes to the caller's own folder.
  const path = `${userId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-buster so the sidebar shows the new image immediately even though
  // the storage path is stable.
  const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ avatar_url: avatarUrl })
}
