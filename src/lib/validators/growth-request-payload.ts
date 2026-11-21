// src/lib/validators/growth-request-payload.ts
//
// SERVER-SIDE validation for the short "Free Growth Review" campaign request
// (POST /api/growth-review-request).
//
// This is a LEAD, not a scored Growth Assessment: three visitor answers plus
// optional attribution. Nothing here feeds HGRI scoring, merchants or Growth
// Profiles. Like assessment-payload.ts, the payload is REBUILT from known keys,
// so nothing a caller invents (or the Turnstile token) can reach a column.

export const GROWTH_REQUEST_SERVICE = 'Free Growth Review (campaign)'
export const ATTRIBUTION_MARKER = '--- Campaign attribution ---'

export const CHALLENGE_MIN = 10
export const CHALLENGE_MAX = 1000

const MAX_WEBSITE = 500
const MAX_EMAIL = 320
const MAX_UTM = 120
const MAX_REFERRER = 300
const MAX_CTA = 60

// Same pattern the other public forms enforce.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Attribution keys, in the order they are written to the stored message. */
export const ATTRIBUTION_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'referrer', 'cta'] as const
export type AttributionField = (typeof ATTRIBUTION_FIELDS)[number]
export type Attribution = Partial<Record<AttributionField, string>>

export interface ValidatedGrowthRequest {
  website: string
  email: string
  biggest_challenge: string
  attribution: Attribution
}

export type GrowthRequestOutcome =
  | { ok: true; value: ValidatedGrowthRequest }
  | { ok: false; error: string }

/** Visitor-facing messages. Deliberately short and free of internals. */
export const GROWTH_REQUEST_ERRORS = {
  website: 'Please enter your store URL, for example yourstore.com.',
  email: 'Please enter a valid email address.',
  challengeEmpty: 'Please tell us the biggest challenge with your store right now.',
  challengeShort: 'Please add a little more detail — a sentence is enough.',
  challengeLong: 'That is a little long. Please shorten it and try again.',
  invalid: 'Please check your answers and try again.',
} as const

/** Strips control characters and normalises whitespace (same behaviour as the other validators). */
function clean(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Single-line attribution value: no newlines, so it cannot forge extra rows in the metadata block. */
function cleanLine(value: string): string {
  return clean(value).replace(/\s+/g, ' ').trim()
}

/**
 * Accepts a bare domain or an http/https URL. Any other scheme is rejected,
 * because the value is later rendered as a link in the admin inbox.
 */
export function normaliseStoreUrl(raw: string): string | null {
  const value = clean(raw)
  if (!value || /\s/.test(value) || value.length > MAX_WEBSITE) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
  if (hasScheme && !/^https?:\/\//i.test(value)) return null
  try {
    const url = new URL(hasScheme ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.') || url.hostname.startsWith('.') || url.hostname.endsWith('.')) return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Lower-cased hostname without "www.", used for the campaign identity and duplicate checks. */
export function storeHostname(normalisedUrl: string): string {
  try {
    return new URL(normalisedUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * A comparable form of the URL: scheme-insensitive, www-insensitive, no
 * trailing slash. "Example.com", "https://www.example.com/" and
 * "http://example.com" are the same store for duplicate protection.
 */
export function comparableStoreKey(normalisedUrl: string): string {
  try {
    const url = new URL(normalisedUrl)
    const path = url.pathname.replace(/\/+$/, '')
    return `${url.hostname.toLowerCase().replace(/^www\./, '')}${path}${url.search}`
  } catch {
    return normalisedUrl.toLowerCase()
  }
}

export function pickAttribution(input: Record<string, unknown>): Attribution {
  const limits: Record<AttributionField, number> = {
    utm_source: MAX_UTM,
    utm_medium: MAX_UTM,
    utm_campaign: MAX_UTM,
    utm_content: MAX_UTM,
    referrer: MAX_REFERRER,
    cta: MAX_CTA,
  }
  const out: Attribution = {}
  for (const key of ATTRIBUTION_FIELDS) {
    const raw = input[key]
    if (typeof raw !== 'string') continue
    // Attribution is optional telemetry: an over-long or blank value is trimmed or dropped, never an error.
    const value = cleanLine(raw).slice(0, limits[key])
    if (value) out[key] = value
  }
  return out
}

export function validateGrowthRequestPayload(input: Record<string, unknown>): GrowthRequestOutcome {
  if (typeof input.website !== 'string') return { ok: false, error: GROWTH_REQUEST_ERRORS.website }
  const website = normaliseStoreUrl(input.website)
  if (!website) return { ok: false, error: GROWTH_REQUEST_ERRORS.website }

  if (typeof input.email !== 'string') return { ok: false, error: GROWTH_REQUEST_ERRORS.email }
  const email = clean(input.email).toLowerCase()
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return { ok: false, error: GROWTH_REQUEST_ERRORS.email }
  }

  if (typeof input.biggest_challenge !== 'string') return { ok: false, error: GROWTH_REQUEST_ERRORS.challengeEmpty }
  const challenge = clean(input.biggest_challenge)
  if (!challenge) return { ok: false, error: GROWTH_REQUEST_ERRORS.challengeEmpty }
  if (challenge.length < CHALLENGE_MIN) return { ok: false, error: GROWTH_REQUEST_ERRORS.challengeShort }
  if (challenge.length > CHALLENGE_MAX) return { ok: false, error: GROWTH_REQUEST_ERRORS.challengeLong }

  return { ok: true, value: { website, email, biggest_challenge: challenge, attribution: pickAttribution(input) } }
}

/**
 * The stored `message`: the visitor's answer, then — only when attribution
 * exists — a clearly separated internal block. The same separator style the
 * Contact enquiry form already uses for budget and timeline.
 */
export function buildStoredMessage(challenge: string, attribution: Attribution): string {
  const rows = ATTRIBUTION_FIELDS.filter((k) => attribution[k]).map((k) => `${k}: ${attribution[k]}`)
  return rows.length ? `${challenge}\n\n${ATTRIBUTION_MARKER}\n${rows.join('\n')}` : challenge
}

/** Inverse of buildStoredMessage, for the admin inbox (pure, never throws). */
export function parseStoredMessage(message: string | null | undefined): { challenge: string; attribution: Attribution } {
  const text = message || ''
  const at = text.indexOf(`\n${ATTRIBUTION_MARKER}\n`)
  if (at === -1) return { challenge: text.trim(), attribution: {} }
  const attribution: Attribution = {}
  for (const line of text.slice(at + ATTRIBUTION_MARKER.length + 2).split('\n')) {
    const split = line.indexOf(': ')
    if (split === -1) continue
    const key = line.slice(0, split) as AttributionField
    if ((ATTRIBUTION_FIELDS as readonly string[]).includes(key)) attribution[key] = line.slice(split + 2).trim()
  }
  return { challenge: text.slice(0, at).trim(), attribution }
}
