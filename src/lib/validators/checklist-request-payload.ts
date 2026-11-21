// src/lib/validators/checklist-request-payload.ts
//
// SERVER-SIDE validation for the BFCM Readiness Checklist request
// (POST /api/bfcm-checklist-request): an email, an OPTIONAL store URL, and
// optional campaign attribution. Rebuilt from known keys, like the other public
// validators, so nothing a caller invents (or the Turnstile token) can reach a
// column. Shares URL/attribution helpers with the Growth Review request.

import {
  ATTRIBUTION_FIELDS,
  buildStoredMessage,
  normaliseStoreUrl,
  pickAttribution,
  storeHostname,
  type Attribution,
} from '@/lib/validators/growth-request-payload'

export const CHECKLIST_REQUEST_SERVICE = 'Free 15-Point BFCM Readiness Checklist'
export const CHECKLIST_REQUEST_MESSAGE = 'Requested the Free 15-Point BFCM Readiness Checklist.'

const MAX_EMAIL = 320
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export const CHECKLIST_REQUEST_ERRORS = {
  email: 'Please enter a valid email address.',
  website: 'We couldn’t read that store address. Try something like yourstore.com, or leave it blank.',
} as const

export interface ValidatedChecklistRequest {
  email: string
  /** Normalised store URL, or null when none was supplied. */
  website: string | null
  attribution: Attribution
}

export type ChecklistRequestOutcome =
  | { ok: true; value: ValidatedChecklistRequest }
  | { ok: false; error: string }

export function validateChecklistRequestPayload(input: Record<string, unknown>): ChecklistRequestOutcome {
  if (typeof input.email !== 'string') return { ok: false, error: CHECKLIST_REQUEST_ERRORS.email }
  // eslint-disable-next-line no-control-regex
  const email = input.email.replace(/[\x00-\x1F\x7F]/g, '').trim().toLowerCase()
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) return { ok: false, error: CHECKLIST_REQUEST_ERRORS.email }

  let website: string | null = null
  const raw = input.website
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== 'string') return { ok: false, error: CHECKLIST_REQUEST_ERRORS.website }
    if (raw.trim() !== '') {
      website = normaliseStoreUrl(raw)
      // An unreadable address is refused rather than silently dropped, so the visitor can fix it.
      if (!website) return { ok: false, error: CHECKLIST_REQUEST_ERRORS.website }
    }
  }

  return { ok: true, value: { email, website, attribution: pickAttribution(input) } }
}

/** Identity for `full_name`: the store hostname when given, else the email's domain. Never a person's name. */
export function checklistIdentity(email: string, website: string | null): string {
  const host = website ? storeHostname(website) : ''
  return host || email.slice(email.lastIndexOf('@') + 1)
}

export { ATTRIBUTION_FIELDS, buildStoredMessage }
