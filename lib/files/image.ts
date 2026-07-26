import sharp from 'sharp'

// Prepare an uploaded image for native Claude vision. We resize to a 1568px
// long edge (the standard-tier cap) so the token cost stays near its floor even
// on a high-resolution model, re-encode to a compact WebP, and make a small
// thumbnail for the chip and message bubble. Cheapest-that-works, per the spike.

const MAX_LONG_EDGE = 1568
const THUMB_EDGE = 384

export type ImageResult =
  | {
      ok: true
      // The resized image, base64 (no data: prefix), for the model image block.
      data: string
      mediaType: 'image/webp'
      // A tiny data URI for the UI (chip + bubble preview).
      thumb: string
      width: number
      height: number
    }
  | { ok: false; reason: string }

// A hard ceiling on how long decode + resize may take, so a pathological image
// fails cleanly instead of hanging the request.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('image processing timed out')), ms)
    ),
  ])
}

export async function processImage(buffer: Buffer): Promise<ImageResult> {
  try {
    return await withTimeout(run(buffer), 8000)
  } catch {
    return {
      ok: false,
      reason: "We couldn't open this image. It may be corrupted or an unsupported type.",
    }
  }
}

async function run(buffer: Buffer): Promise<ImageResult> {
  // failOn 'error' rejects truncated/corrupt images; the first frame of an
  // animation is used (sharp reads one page unless told otherwise).
  const meta = await sharp(buffer, { failOn: 'error' }).metadata()
  if (!meta.width || !meta.height) {
    return { ok: false, reason: "We couldn't read this image. Try a PNG or JPEG." }
  }

  // rotate() with no args applies EXIF orientation (phone screenshots/photos).
  const resized = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  const thumbBuf = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({
      width: THUMB_EDGE,
      height: THUMB_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 70 })
    .toBuffer()

  return {
    ok: true,
    data: resized.data.toString('base64'),
    mediaType: 'image/webp',
    thumb: `data:image/webp;base64,${thumbBuf.toString('base64')}`,
    width: resized.info.width,
    height: resized.info.height,
  }
}
