// src/lib/onboarding-storage-path.ts
//
// Normalizes and validates a client_onboarding_files.file_url database value
// into a safe, bucket-relative object path before it is ever passed to
// createSignedUrl(). Every return is either a validated path or `null` —
// callers MUST treat `null` as "cannot produce a download link for this row"
// and fail closed. The raw database value is never forwarded to Storage.
//
// WHY BOTH SHAPES ARE ACCEPTED. Every existing row stores a full PUBLIC URL,
// because /api/onboarding built one with getPublicUrl() at upload time. M10
// rewrites those into bare object paths and stores the originals in
// public.client_onboarding_file_url_backup_m10, and the upload route now writes
// the path directly — but this helper must keep working either side of that
// migration, and after any manual restore from the backup. So it accepts:
//
//   1. A bare object path, `{projectId}/{timestamp}-{sanitized name}`.
//   2. A full Supabase public-storage URL for THIS project and exactly the
//      onboarding-files bucket.
//
// It rejects everything else: empty/non-string values, a URL for a different
// bucket, a URL for a different Supabase project or host, a leading slash,
// `..` traversal, backslashes, control characters, and malformed
// percent-encoding.
//
// Deliberately mirrors src/lib/storage-path.ts rather than generalizing it: the
// two buckets have different path conventions and different callers, and a
// single "resolve any path in any bucket" helper is exactly the kind of thing
// that later gets called with a bucket the caller controls.

export const ONBOARDING_FILES_BUCKET = 'onboarding-files'

/**
 * decodeURIComponent that never throws. A string containing a literal `%` not
 * followed by two hex digits raises URIError; that is treated as malformed
 * percent-encoding and rejected rather than guessed at. The upload route
 * sanitizes each filename to [A-Za-z0-9._-], so a legitimate stored key cannot
 * contain a raw `%`.
 */
function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function isTraversalSafe(path: string): boolean {
  if (!path) return false
  if (path.startsWith('/')) return false // leading-slash / absolute path
  if (path.includes('..')) return false // parent-directory traversal
  if (path.includes('\\')) return false // defensive: no backslashes
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(path)) return false // control chars / NUL
  return true
}

/**
 * @param fileUrl the raw client_onboarding_files.file_url database value
 * @param expectedProjectId when provided, the resolved path must additionally
 *   start with `{expectedProjectId}/` — the exact convention /api/onboarding
 *   uses. The download route always passes the project_id stored on the file
 *   row itself, so a row cannot be used to reach another submission's folder.
 * @returns the validated bucket-relative path, or null (fail closed)
 */
export function toOnboardingFilesObjectPath(
  fileUrl: string | null | undefined,
  expectedProjectId?: string | null,
): string | null {
  if (typeof fileUrl !== 'string' || fileUrl.length === 0) return null

  let candidate: string

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(fileUrl) || fileUrl.startsWith('//')) {
    // Must be a full public URL for THIS Supabase project and exactly the
    // onboarding-files bucket — never another bucket, host, or project.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null // can't confirm the project matches -> fail closed

    const base = supabaseUrl.replace(/\/+$/, '')
    const marker = `${base}/storage/v1/object/public/${ONBOARDING_FILES_BUCKET}/`
    if (!fileUrl.startsWith(marker)) return null

    const decoded = decodeSafely(fileUrl.slice(marker.length))
    if (decoded === null) return null
    candidate = decoded
  } else {
    // Already a bare object path (the shape M10 leaves behind, and the shape
    // new uploads store).
    const decoded = decodeSafely(fileUrl)
    if (decoded === null) return null
    candidate = decoded
  }

  if (!isTraversalSafe(candidate)) return null

  if (expectedProjectId) {
    if (!/^[A-Za-z0-9._-]+$/.test(expectedProjectId)) return null
    if (!candidate.startsWith(`${expectedProjectId}/`)) return null
  }

  return candidate
}

/**
 * Builds the object key for a new onboarding upload:
 *   {projectId}/{timestamp}-{sanitized file name}
 *
 * Unchanged from what /api/onboarding already produced — only what gets STORED
 * in the database changes (this path, not a public URL).
 */
export function buildOnboardingObjectPath(
  projectId: string,
  timestamp: number,
  rawFileName: string,
): string {
  const safeName = String(rawFileName ?? '').split(/[\\/]/).pop() || 'file'
  return `${projectId}/${timestamp}-${safeName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
}
