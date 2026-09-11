// src/lib/uploads/upload-config.ts
//
// The shared upload contract. Safe to import from BOTH the browser and the
// server: it contains no credentials, no service-role client and no database
// access — only the declarative rules that both sides must agree on.
//
// There is exactly ONE upload transport in this application: signed TUS
// resumable uploads (see src/lib/uploads/tus-upload.ts). Every size uses it, so
// progress, retry and cancellation behave identically for a 40 KB CSV and a
// 24 MB deck. The browser never holds a service-role key: it receives a
// short-lived signed upload token, issued by the server, that is valid for one
// server-selected object path and nothing else.
//
// The values below are the EXISTING contracts, not new ones:
//   - proposal    25 MB, document allow-list (mirrors proposal-file-validation.ts)
//   - client_file 25 MB, business-file allow-list (mirrors the client portal)
// A test asserts the proposal table here still matches
// src/lib/proposal-file-validation.ts, so the two cannot drift apart silently.

export type UploadContext = 'proposal' | 'client_file'

export const UPLOAD_CONTEXTS: UploadContext[] = ['proposal', 'client_file']

/** Longest sanitized base name kept before the extension. */
const MAX_BASE_NAME_LENGTH = 120

/** No batch may exceed this many files, in the request or in the database. */
export const MAX_FILES_PER_BATCH = 20

/**
 * Supabase issues resumable upload URLs that stay valid for up to 24 hours.
 * A pending upload session must therefore OUTLIVE its own token, otherwise
 * cleanup could delete the object of an upload that is still legitimately in
 * progress. The two-hour margin is deliberate slack on top of that 24 hours.
 */
export const UPLOAD_SESSION_TTL_HOURS = 26

export interface UploadContextSpec {
  context: UploadContext
  bucket: string
  /** Every object path this context may ever write begins with this prefix. */
  pathPrefix: string
  maxBytes: number
  maxBytesLabel: string
  /** extension -> declared MIME values browsers actually send for it */
  extensions: Record<string, string[]>
  /** extension -> the MIME value stored when the browser sends a generic one */
  canonicalMime: Record<string, string>
}

/**
 * Browsers on machines without Office installed routinely report an empty or
 * generic type for .docx/.pptx/.xlsx. These are accepted ONLY when the
 * extension is already allow-listed, and the canonical MIME for that extension
 * is stored instead of the generic string. Same trade-off, and same reasoning,
 * as proposal-file-validation.ts.
 */
const GENERIC_MIME_TYPES = ['', 'application/octet-stream', 'binary/octet-stream']

const DOCUMENT_EXTENSIONS: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
}

const DOCUMENT_CANONICAL: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

// The client portal's existing allow-list: images, common documents, archives.
const CLIENT_FILE_EXTENSIONS: Record<string, string[]> = {
  ...DOCUMENT_EXTENSIONS,
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
}

const CLIENT_FILE_CANONICAL: Record<string, string> = {
  ...DOCUMENT_CANONICAL,
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  txt: 'text/plain',
  zip: 'application/zip',
}

const MB = 1024 * 1024

export const UPLOAD_SPECS: Record<UploadContext, UploadContextSpec> = {
  proposal: {
    context: 'proposal',
    bucket: 'proposal-files',
    pathPrefix: 'proposals/',
    maxBytes: 25 * MB,
    maxBytesLabel: '25MB',
    extensions: DOCUMENT_EXTENSIONS,
    canonicalMime: DOCUMENT_CANONICAL,
  },
  client_file: {
    context: 'client_file',
    bucket: 'project-files',
    pathPrefix: 'client-files/',
    maxBytes: 25 * MB,
    maxBytesLabel: '25MB',
    extensions: CLIENT_FILE_EXTENSIONS,
    canonicalMime: CLIENT_FILE_CANONICAL,
  },
}

export function isUploadContext(value: unknown): value is UploadContext {
  return typeof value === 'string' && (UPLOAD_CONTEXTS as string[]).includes(value)
}

/** `.pdf,.doc,...` for a file input's accept attribute. */
export function acceptAttribute(context: UploadContext): string {
  return Object.keys(UPLOAD_SPECS[context].extensions)
    .map((ext) => `.${ext}`)
    .join(',')
}

export function allowedExtensionLabel(context: UploadContext): string {
  return Object.keys(UPLOAD_SPECS[context].extensions)
    .map((e) => e.toUpperCase())
    .join(', ')
}

/**
 * Everything outside [A-Za-z0-9.-] becomes `_`, any directory component is
 * stripped, and the base name is length-capped with the extension preserved.
 * Identical to sanitizeProposalFileName() — kept here so the browser can show
 * the same name the server will store.
 */
export function sanitizeUploadFileName(rawName: string): string {
  const baseOnly = String(rawName ?? '').split(/[\\/]/).pop() || ''
  const cleaned = baseOnly.replace(/[^a-zA-Z0-9.-]/g, '_')

  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot <= 0) return cleaned.slice(0, MAX_BASE_NAME_LENGTH)

  const base = cleaned.slice(0, lastDot)
  const ext = cleaned.slice(lastDot)
  return `${base.slice(0, MAX_BASE_NAME_LENGTH)}${ext}`
}

export function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

export interface ValidatedUploadMetadata {
  fileName: string
  contentType: string
  size: number
  extension: string
}

export type UploadMetadataResult =
  | { ok: true; file: ValidatedUploadMetadata }
  | { ok: false; error: string }

/**
 * Validates the metadata DECLARED for one file before any token is issued.
 *
 * A declared size and MIME are client-supplied and trivially spoofable, so this
 * is a first gate only. The authoritative check happens at finalization, where
 * the server reads the size and MIME that Storage actually recorded for the
 * stored object and re-applies the same rules (see verifyStoredObject in
 * upload-session.ts). Nothing becomes downloadable until that passes.
 */
export function validateUploadMetadata(
  context: UploadContext,
  input: { fileName?: unknown; size?: unknown; contentType?: unknown },
): UploadMetadataResult {
  const spec = UPLOAD_SPECS[context]

  if (typeof input.fileName !== 'string' || !input.fileName.trim()) {
    return { ok: false, error: 'A file name is required.' }
  }

  const fileName = sanitizeUploadFileName(input.fileName)
  if (!fileName || fileName === '.' || fileName.replace(/[._-]/g, '') === '') {
    return { ok: false, error: 'That file name is not valid.' }
  }

  const extension = extensionOf(fileName)
  if (!extension || !spec.extensions[extension]) {
    return {
      ok: false,
      error: `That file type is not supported. Allowed: ${allowedExtensionLabel(context)}.`,
    }
  }

  const size = typeof input.size === 'number' ? input.size : NaN
  if (!Number.isFinite(size) || !Number.isInteger(size) || size <= 0) {
    return { ok: false, error: 'That file appears to be empty.' }
  }
  if (size > spec.maxBytes) {
    return { ok: false, error: `File is too large. Maximum size is ${spec.maxBytesLabel}.` }
  }

  const declared = String(input.contentType ?? '').toLowerCase().trim()
  const permitted = spec.extensions[extension]
  const isGeneric = GENERIC_MIME_TYPES.includes(declared)

  if (!isGeneric && !permitted.includes(declared)) {
    return { ok: false, error: `The file contents do not match its .${extension} extension.` }
  }

  return {
    ok: true,
    file: {
      fileName,
      contentType: isGeneric ? spec.canonicalMime[extension] : declared,
      size,
      extension,
    },
  }
}

/**
 * Re-applies the type and size rules to what Storage ACTUALLY recorded for a
 * stored object. Used at finalization, where `size` is the byte count Storage
 * measured and `mimeType` is what it stored — neither is client-supplied at
 * that point.
 *
 * The declared size must match exactly: a resumable upload declares its total
 * length up front (Upload-Length), so a mismatch means the stored object is not
 * the file that was authorized.
 */
export function verifyStoredMetadata(
  context: UploadContext,
  stored: { size: number; mimeType?: string | null },
  declared: { size: number; contentType: string; extension: string },
): { ok: true } | { ok: false; reason: string } {
  const spec = UPLOAD_SPECS[context]

  if (!Number.isFinite(stored.size) || stored.size <= 0) {
    return { ok: false, reason: 'stored_object_empty' }
  }
  if (stored.size > spec.maxBytes) {
    return { ok: false, reason: 'stored_object_too_large' }
  }
  if (stored.size !== declared.size) {
    return { ok: false, reason: 'stored_size_mismatch' }
  }

  const permitted = spec.extensions[declared.extension]
  if (!permitted) return { ok: false, reason: 'extension_not_allowed' }

  const storedMime = String(stored.mimeType ?? '').toLowerCase().trim()
  // Storage records the contentType the upload declared. It must still be one
  // this context permits for that extension, or the canonical value we chose.
  const acceptable =
    GENERIC_MIME_TYPES.includes(storedMime) ||
    permitted.includes(storedMime) ||
    storedMime === declared.contentType

  if (!acceptable) return { ok: false, reason: 'stored_mime_not_allowed' }

  return { ok: true }
}
