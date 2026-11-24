/**
 * Image trim / crop helpers for the Media Library (admin only, browser side, before upload).
 *
 * The pure functions (bounds scanning, padding, background detection, capping) take plain pixel data so they can be tested
 * without a browser. The two canvas functions at the bottom decode and re-encode. Nothing here uploads or validates: an
 * edited file goes back through prepareImageFile (MIME, magic bytes, dimensions, checksum) exactly like a fresh pick.
 *
 * No dependency. Never upscales. Never alters an already-uploaded asset.
 */

export interface PixelRect { left: number; top: number; width: number; height: number }
export interface Rgb { r: number; g: number; b: number }

/** Alpha at or below this counts as empty (anti-aliasing fringe above it is kept). */
export const ALPHA_THRESHOLD = 8
/** Breathing room kept around the detected mark, as a share of its longer side. */
export const BREATHING_RATIO = 0.02
/** Analysis runs on a copy no larger than this on its longest side; the result is mapped back to full resolution. */
export const SCAN_MAX_SIDE = 2048
/** The output canvas is never larger than this many pixels (a downscale guard, never an upscale). */
export const MAX_OUTPUT_PIXELS = 24_000_000

type Pixels = ArrayLike<number>

/** True when at least one pixel is not fully opaque. */
export function hasTransparency(data: Pixels, width: number, height: number): boolean {
  const count = width * height
  for (let i = 0; i < count; i += 1) if (data[i * 4 + 3] < 255) return true
  return false
}

/** Bounding box of every pixel whose alpha is above the threshold, or null when the image is entirely empty. */
export function findOpaqueBounds(data: Pixels, width: number, height: number, threshold = ALPHA_THRESHOLD): PixelRect | null {
  let top = -1, bottom = -1, left = width, right = -1
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4
    let first = -1, last = -1
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] > threshold) { if (first < 0) first = x; last = x }
    }
    if (first >= 0) {
      if (top < 0) top = y
      bottom = y
      if (first < left) left = first
      if (last > right) right = last
    }
  }
  if (top < 0) return null
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/** Grow a box by ~2% of its longer side (at least 1px), clamped to the image. */
export function addBreathingRoom(rect: PixelRect, width: number, height: number, ratio = BREATHING_RATIO): PixelRect {
  const pad = Math.max(1, Math.round(Math.max(rect.width, rect.height) * ratio))
  const left = Math.max(0, rect.left - pad)
  const top = Math.max(0, rect.top - pad)
  const right = Math.min(width, rect.left + rect.width + pad)
  const bottom = Math.min(height, rect.top + rect.height + pad)
  return { left, top, width: right - left, height: bottom - top }
}

/** True when the rect is the whole image (nothing to trim). */
export const coversImage = (rect: PixelRect, width: number, height: number): boolean =>
  rect.left <= 0 && rect.top <= 0 && rect.width >= width && rect.height >= height

/**
 * A solid background colour, offered ONLY when all four corner patches are opaque and nearly identical.
 * Anything else (transparency, gradients, photos, mixed corners) returns null and no solid-trim option is shown.
 */
export function detectUniformBackground(data: Pixels, width: number, height: number, tolerance = 10): Rgb | null {
  if (width < 8 || height < 8) return null
  const size = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) / 8)))
  const corners: Rgb[] = []
  for (const [x0, y0] of [[0, 0], [width - size, 0], [0, height - size], [width - size, height - size]]) {
    let r = 0, g = 0, b = 0, a = 0
    for (let y = y0; y < y0 + size; y += 1) for (let x = x0; x < x0 + size; x += 1) {
      const i = (y * width + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]
    }
    const n = size * size
    if (a / n < 250) return null
    corners.push({ r: r / n, g: g / n, b: b / n })
  }
  const [first, ...rest] = corners
  if (!rest.every((c) => Math.max(Math.abs(c.r - first.r), Math.abs(c.g - first.g), Math.abs(c.b - first.b)) <= tolerance)) return null
  return { r: Math.round(first.r), g: Math.round(first.g), b: Math.round(first.b) }
}

/**
 * Bounds of everything that differs from the background colour. Deliberately cautious: a pixel counts as content when ANY
 * channel differs by more than the tolerance, so white details inside a mark on a white background are never "removed"
 * (only the outer empty margin is trimmed, and the result is only a proposed crop that the owner previews before applying).
 * Returns null when nothing differs, or when the content is so small it is almost certainly noise.
 */
export function findBackgroundBounds(data: Pixels, width: number, height: number, background: Rgb, tolerance = 28): PixelRect | null {
  let top = -1, bottom = -1, left = width, right = -1
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4
    let first = -1, last = -1
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4
      const content = data[i + 3] > ALPHA_THRESHOLD && Math.max(Math.abs(data[i] - background.r), Math.abs(data[i + 1] - background.g), Math.abs(data[i + 2] - background.b)) > tolerance
      if (content) { if (first < 0) first = x; last = x }
    }
    if (first >= 0) {
      if (top < 0) top = y
      bottom = y
      if (first < left) left = first
      if (last > right) right = last
    }
  }
  if (top < 0) return null
  const rect = { left, top, width: right - left + 1, height: bottom - top + 1 }
  return rect.width * rect.height < width * height * 0.002 ? null : rect
}

/** Scale (<= 1, never an upscale) that keeps a canvas within the pixel budget. */
export function outputScale(width: number, height: number, maxPixels = MAX_OUTPUT_PIXELS): number {
  const pixels = width * height
  return pixels <= maxPixels ? 1 : Math.sqrt(maxPixels / pixels)
}

/** Map a rect found on a downscaled analysis copy back to full resolution, widened by one analysis pixel each side. */
export function mapRectToSource(rect: PixelRect, scale: number, sourceWidth: number, sourceHeight: number): PixelRect {
  if (scale >= 1) return rect
  const slack = Math.ceil(1 / scale)
  const left = Math.max(0, Math.floor(rect.left / scale) - slack)
  const top = Math.max(0, Math.floor(rect.top / scale) - slack)
  const right = Math.min(sourceWidth, Math.ceil((rect.left + rect.width) / scale) + slack)
  const bottom = Math.min(sourceHeight, Math.ceil((rect.top + rect.height) / scale) + slack)
  return { left, top, width: right - left, height: bottom - top }
}

/** Clamp a requested crop to the image and to at least 1 × 1. */
export function clampRect(rect: PixelRect, width: number, height: number): PixelRect {
  const left = Math.min(Math.max(0, Math.round(rect.left)), width - 1)
  const top = Math.min(Math.max(0, Math.round(rect.top)), height - 1)
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(rect.width), width - left)),
    height: Math.max(1, Math.min(Math.round(rect.height), height - top)),
  }
}

/** Output type: JPEG stays JPEG (no alpha to keep); everything else becomes PNG, which preserves transparency losslessly. */
export const editedMime = (sourceMime: string): 'image/jpeg' | 'image/png' => (sourceMime === 'image/jpeg' ? 'image/jpeg' : 'image/png')

/** `logo.webp` + image/png → `logo-edited.png`. Only used as a label; storage paths are generated separately. */
export function editedFileName(original: string, mime: string): string {
  const leaf = String(original ?? '').split(/[\\/]/).pop() ?? 'image'
  const base = leaf.replace(/\.[A-Za-z0-9]{1,8}$/, '').replace(/-edited$/, '') || 'image'
  return `${base}-edited.${mime === 'image/jpeg' ? 'jpg' : 'png'}`
}

/* ── Browser-only (canvas) ─────────────────────────────────────────────── */

export interface DecodedImage { source: CanvasImageSource & { width: number; height: number }; width: number; height: number; close: () => void }

/** Decode with EXIF orientation applied; falls back to an <img> element. */
export async function decodeForEdit(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() }
    } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('This image could not be opened for editing.'))
      img.src = url
    })
    return { source: image as unknown as DecodedImage['source'], width: image.naturalWidth, height: image.naturalHeight, close: () => {} }
  } finally { URL.revokeObjectURL(url) }
}

export interface ImageAnalysis {
  width: number
  height: number
  transparent: boolean
  /** Opaque-content box plus breathing room, full-resolution; null when there is nothing to trim or the image is fully empty. */
  transparentTrim: PixelRect | null
  /** Solid background colour, only when all four corners agree. */
  background: Rgb | null
  /** Proposed crop around everything that differs from that background (opt-in). */
  backgroundTrim: PixelRect | null
}

/** Scan a (downscaled) copy once. Everything returned is already mapped to full-resolution coordinates. */
export function analyseImage(image: DecodedImage): ImageAnalysis {
  const scale = Math.min(1, SCAN_MAX_SIDE / Math.max(image.width, image.height))
  const w = Math.max(1, Math.round(image.width * scale))
  const h = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser cannot analyse images.')
  context.clearRect(0, 0, w, h)
  context.drawImage(image.source, 0, 0, w, h)
  const data = context.getImageData(0, 0, w, h).data
  const transparent = hasTransparency(data, w, h)
  const full = (rect: PixelRect | null) => (rect ? addBreathingRoom(mapRectToSource(rect, scale, image.width, image.height), image.width, image.height) : null)
  const opaque = transparent ? full(findOpaqueBounds(data, w, h)) : null
  const background = transparent ? null : detectUniformBackground(data, w, h)
  const solid = background ? full(findBackgroundBounds(data, w, h, background)) : null
  const useful = (rect: PixelRect | null) => (rect && !coversImage(rect, image.width, image.height) ? rect : null)
  return { width: image.width, height: image.height, transparent, transparentTrim: useful(opaque), background, backgroundTrim: useful(solid) }
}

/** Crop at natural resolution (never upscaled; only downscaled if the pixel budget would be exceeded) and encode. */
export async function renderCrop(image: DecodedImage, rect: PixelRect, mime: 'image/jpeg' | 'image/png'): Promise<Blob> {
  const crop = clampRect(rect, image.width, image.height)
  const scale = outputScale(crop.width, crop.height)
  const width = Math.max(1, Math.round(crop.width * scale))
  const height = Math.max(1, Math.round(crop.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot edit images.')
  context.drawImage(image.source, crop.left, crop.top, crop.width, crop.height, 0, 0, width, height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The edited image could not be created.'))), mime, mime === 'image/jpeg' ? 0.92 : undefined)
  })
}
