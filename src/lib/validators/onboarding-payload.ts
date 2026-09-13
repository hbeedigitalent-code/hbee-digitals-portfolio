// src/lib/validators/onboarding-payload.ts
//
// SERVER-SIDE strict validation for the public client-onboarding endpoint.
//
// src/lib/validators/onboarding-validation.ts validates the same form in the
// browser to drive per-step errors. That file is a UX aid and is NOT a security
// control — /api/onboarding is public and unauthenticated, so everything it
// accepts must be re-checked here against an explicit allow-list.
//
// The route previously parsed `data` with a bare JSON.parse and spread
// `data.<field> || null` straight into the insert, and accepted any number of
// files of any size and any type into Supabase Storage using the service-role
// key. Both halves are validated here.
//
// Like assessment-payload.ts, this REBUILDS the payload from known keys rather
// than filtering the parsed object, so an invented field cannot reach a column.
//
// FILE RULES ARE DEFINED LOCALLY, ON PURPOSE.
// src/lib/uploads/upload-config.ts owns the 'proposal' and 'client_file'
// contexts and has a test asserting it still matches proposal-file-validation.ts.
// Onboarding is a third context with different needs (brand assets as well as
// documents), so adding it there would widen a contract another test pins.
// Only the filename sanitizer is reused, which is what it exists for.

import { sanitizeUploadFileName } from '@/lib/uploads/upload-config'

/** Exactly the columns the route writes to `client_onboarding_submissions`. */
export interface ValidatedOnboarding {
  project_title: string
  business_name: string
  website_url: string | null
  service_needed: string
  project_goals: string
  preferred_timeline: string
  budget_range: string
  main_challenge: string
  full_name: string
  email: string
  whatsapp: string
  communication_method: string
  notes: string | null
  consent: true
}

export type OnboardingValidationOutcome =
  | { ok: true; value: ValidatedOnboarding }
  | { ok: false; error: string }

export interface ValidatedFile {
  file: File
  /** Safe display name. Stored as `file_name` and used to build the object path. */
  safeName: string
  /** Canonical MIME stored as `file_type`. */
  contentType: string
}

export type FileValidationOutcome =
  | { ok: true; value: ValidatedFile[] }
  | { ok: false; error: string }

// --- field rules -------------------------------------------------------------

const MAX_LENGTHS: Record<string, number> = {
  project_title: 200,
  business_name: 200,
  website_url: 500,
  service_needed: 120,
  project_goals: 3000,
  preferred_timeline: 120,
  budget_range: 120,
  main_challenge: 3000,
  full_name: 200,
  email: 320, // RFC 5321 maximum
  whatsapp: 50,
  communication_method: 120,
  notes: 3000,
}

/** Required, in the same set the browser's step validator enforces. */
const REQUIRED_FIELDS = [
  'project_title',
  'business_name',
  'service_needed',
  'project_goals',
  'preferred_timeline',
  'budget_range',
  'main_challenge',
  'full_name',
  'email',
  'whatsapp',
  'communication_method',
] as const

const OPTIONAL_FIELDS = ['notes'] as const

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
const PHONE_RE = /^[+()\-.\s\d]{5,50}$/

// --- file rules --------------------------------------------------------------

/** Onboarding is a first submission, not a delivery channel. */
export const MAX_ONBOARDING_FILES = 10
export const MAX_ONBOARDING_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_ONBOARDING_TOTAL_BYTES = 40 * 1024 * 1024 // 40 MB per submission

/**
 * Documents plus the raster image formats a brand kit actually arrives in.
 *
 * SVG IS DELIBERATELY EXCLUDED. An SVG is a document that can carry <script>,
 * and these files are later served to admins through a signed URL; an allowed
 * SVG would be stored XSS aimed at staff. Clients needing vector assets can
 * send a PDF or a zip.
 */
const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  zip: 'application/zip',
}

function clean(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normaliseWebsite(raw: string): string | null {
  const value = clean(raw)
  if (!value) return null
  if (value.length > MAX_LENGTHS.website_url) return null

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`

  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Parse and validate the JSON `data` part of the multipart body.
 *
 * Takes the RAW string so the JSON.parse failure is handled here rather than
 * escaping into the route's catch-all and surfacing as a 500.
 */
export function validateOnboardingPayload(dataRaw: string): OnboardingValidationOutcome {
  if (typeof dataRaw !== 'string' || dataRaw.length === 0) {
    return { ok: false, error: 'Missing form data.' }
  }
  // A generous ceiling that still refuses a body designed to exhaust the parser.
  if (dataRaw.length > 100_000) {
    return { ok: false, error: 'That submission is too large.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(dataRaw)
  } catch {
    return { ok: false, error: 'Malformed form data.' }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Malformed form data.' }
  }

  const input = parsed as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const field of REQUIRED_FIELDS) {
    const raw = input[field]
    if (typeof raw !== 'string') {
      return { ok: false, error: `Missing or invalid field: ${field}` }
    }

    const value = clean(raw)
    if (!value) {
      return { ok: false, error: `Missing or invalid field: ${field}` }
    }
    if (value.length > (MAX_LENGTHS[field] ?? 500)) {
      return { ok: false, error: `The value for ${field} is too long.` }
    }

    if (field === 'email') {
      const email = value.toLowerCase()
      if (!EMAIL_RE.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' }
      }
      out.email = email
      continue
    }

    if (field === 'whatsapp' && !PHONE_RE.test(value)) {
      return { ok: false, error: 'Please enter a valid WhatsApp number.' }
    }

    out[field] = value
  }

  for (const field of OPTIONAL_FIELDS) {
    const raw = input[field]
    if (typeof raw !== 'string') {
      out[field] = null
      continue
    }
    const value = clean(raw)
    if (!value) {
      out[field] = null
      continue
    }
    if (value.length > (MAX_LENGTHS[field] ?? 500)) {
      return { ok: false, error: `The value for ${field} is too long.` }
    }
    out[field] = value
  }

  // Optional, but rejected rather than silently dropped when unusable, so a
  // typo can be corrected instead of the value disappearing without notice.
  const rawWebsite = input.website_url
  if (typeof rawWebsite === 'string' && clean(rawWebsite)) {
    const website = normaliseWebsite(rawWebsite)
    if (!website) {
      return { ok: false, error: 'Please enter a valid website address, or leave it blank.' }
    }
    out.website_url = website
  } else {
    out.website_url = null
  }

  // Consent must be an explicit boolean true — not "true", not 1.
  if (input.consent !== true) {
    return { ok: false, error: 'Consent is required to submit this form.' }
  }
  out.consent = true

  return { ok: true, value: out as unknown as ValidatedOnboarding }
}

/**
 * Validate the uploaded files.
 *
 * Size is read from the File object, which the runtime measures — it is never
 * taken from a form field. The extension drives the stored MIME: a browser's
 * declared `type` is caller-controlled and is not trusted as the canonical
 * value, matching how proposal-file-validation.ts treats generic MIME types.
 */
export function validateOnboardingFiles(files: File[]): FileValidationOutcome {
  if (files.length === 0) {
    return { ok: true, value: [] }
  }
  if (files.length > MAX_ONBOARDING_FILES) {
    return {
      ok: false,
      error: `Please attach no more than ${MAX_ONBOARDING_FILES} files.`,
    }
  }

  const out: ValidatedFile[] = []
  let totalBytes = 0

  for (const file of files) {
    // A non-File entry means the multipart body was hand-built.
    if (!(file instanceof File)) {
      return { ok: false, error: 'One of the attachments is not a valid file.' }
    }
    if (file.size === 0) {
      return { ok: false, error: `"${file.name}" is empty.` }
    }
    if (file.size > MAX_ONBOARDING_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" is larger than ${
          MAX_ONBOARDING_FILE_BYTES / (1024 * 1024)
        } MB.`,
      }
    }

    totalBytes += file.size
    if (totalBytes > MAX_ONBOARDING_TOTAL_BYTES) {
      return {
        ok: false,
        error: `Those attachments total more than ${
          MAX_ONBOARDING_TOTAL_BYTES / (1024 * 1024)
        } MB. Please send fewer or smaller files.`,
      }
    }

    const safeName = sanitizeUploadFileName(file.name)
    const extension = safeName.includes('.')
      ? safeName.split('.').pop()!.toLowerCase()
      : ''

    const contentType = ALLOWED_EXTENSIONS[extension]
    if (!contentType) {
      return {
        ok: false,
        error: `"${file.name}" is not an accepted file type. Accepted types: ${Object.keys(
          ALLOWED_EXTENSIONS,
        ).join(', ')}.`,
      }
    }

    out.push({ file, safeName, contentType })
  }

  return { ok: true, value: out }
}
