/** Browser validation for the existing public portfolio uploader, not private files. */
export async function portfolioUploadExtension(file: File): Promise<string> {
  const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
  const extension = extensions[file.type]
  if (!extension) throw new Error('Upload PNG, JPEG, WebP, GIF or AVIF. Export SVG artwork to a raster image before uploading.')
  if (file.size > 5 * 1024 * 1024 || file.size < 1) throw new Error('Image must be non-empty and less than 5MB.')
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))
  const valid = extension === 'png' ? [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)
    : extension === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : extension === 'gif' ? ['GIF87a','GIF89a'].includes(ascii(0,6))
    : extension === 'webp' ? ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP'
    : ascii(4,8) === 'ftyp' && /avif|avis/.test(ascii(8,32))
  if (!valid) throw new Error('The file contents do not match its image MIME type.')
  return extension
}
