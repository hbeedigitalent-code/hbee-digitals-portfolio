import { sha256Hex } from './media-checksum'
import { MediaValidationError, validateDimensions, validateImageBytes, type ValidatedImage } from './media-validation'

export interface PreparedImage extends ValidatedImage { width: number; height: number; checksum: string | null }

export interface PrepareDeps {
  /** Natural size of the image. Defaults to browser decoding. Must throw when the image cannot be decoded. */
  readDimensions?: (file: Blob) => Promise<{ width: number; height: number }>
  hash?: (data: ArrayBuffer) => Promise<string | null>
}

/** Decode in the browser; a file that cannot be decoded is rejected (also catches corrupt files and unsupported AVIF). */
export async function decodeImageSize(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close?.()
      return size
    } catch { /* fall through to <img> */ }
  }
  if (typeof Image === 'undefined' || typeof URL === 'undefined') throw new MediaValidationError('This browser cannot read the image size.')
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new MediaValidationError('This image could not be read. It may be corrupted, or your browser may not support this format. Try PNG, JPEG or WebP.'))
      img.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}

/**
 * Everything checked before a byte is uploaded: size, declared type vs magic bytes, SVG/markup rejection, decodable
 * dimensions, and the SHA-256 used for duplicate detection.
 */
export async function prepareImageFile(file: File, deps: PrepareDeps = {}): Promise<PreparedImage> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  const validated = validateImageBytes({ size: file.size, declaredType: file.type, head })
  const { width, height } = await (deps.readDimensions ?? decodeImageSize)(file)
  validateDimensions(width, height)
  const checksum = await (deps.hash ?? sha256Hex)(await file.arrayBuffer())
  return { ...validated, width, height, checksum }
}
