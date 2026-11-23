/** SHA-256 of a file's bytes as lowercase hex (64 chars). Null when WebCrypto is unavailable (the duplicate check is then skipped). */
export async function sha256Hex(data: ArrayBuffer): Promise<string | null> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
