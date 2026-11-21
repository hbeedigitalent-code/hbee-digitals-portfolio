/**
 * Quick Growth Review form model (BFCM sprint): copy, validation and
 * attribution capture for the three-field campaign form. Pure — no React — so
 * the rules can be exercised directly in tests.
 *
 * This is a LEAD form. It posts to /api/growth-review-request and has nothing
 * to do with the scored Growth Assessment (form-model.ts / GrowthReviewForm).
 */

import { isValidWebsite } from './form-model'

export const QUICK_SUBMIT_URL = '/api/growth-review-request'

export const QUICK_COPY = {
  urlLabel: 'Store URL',
  urlPlaceholder: 'yourstore.com',
  emailLabel: 'Email',
  emailPlaceholder: 'you@yourstore.com',
  challengeLabel: 'What’s the biggest challenge with your store right now?',
  challengePlaceholder: 'For example: plenty of visitors, but very few first orders.',
  cta: 'Get My Free Growth Review',
  busy: 'Sending…',
  timeNote: 'Takes under a minute.',
  privacy: 'We only use this to review your store and send your Growth Review.',
} as const

export const QUICK_MSG = {
  website: 'Please enter your store URL, for example yourstore.com.',
  emailEmpty: 'Please add your email address.',
  emailInvalid: 'That email address doesn’t look quite right — please check it.',
  challengeEmpty: 'Please tell us the biggest challenge with your store right now.',
  challengeShort: 'Please add a little more detail — a sentence is enough.',
  turnstileMissing: 'Please complete the security check.',
  rateLimit: 'We couldn’t take another request just yet. Please wait a few minutes and try again.',
  turnstile: 'We couldn’t complete the security check. Please try it again.',
  rejected: 'Please check your answers and try again.',
  server: 'Something went wrong on our side and your request wasn’t sent. Please try again in a moment.',
  offline: 'We couldn’t reach Hbee just now. Check your connection and try again.',
} as const

export const QUICK_CHALLENGE = { min: 10, max: 1000 } as const

export interface QuickAnswers {
  website: string
  email: string
  biggest_challenge: string
}

export type QuickField = keyof QuickAnswers | 'turnstile'

export const EMPTY_QUICK: QuickAnswers = { website: '', email: '', biggest_challenge: '' }

// Same pattern the server enforces (growth-request-payload.ts).
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function validateQuickField(field: QuickField, a: QuickAnswers, turnstile: string | null): string | null {
  switch (field) {
    case 'website':
      return isValidWebsite(a.website) ? null : QUICK_MSG.website
    case 'email':
      if (!a.email.trim()) return QUICK_MSG.emailEmpty
      return EMAIL_RE.test(a.email.trim().toLowerCase()) ? null : QUICK_MSG.emailInvalid
    case 'biggest_challenge': {
      const t = a.biggest_challenge.trim()
      if (!t) return QUICK_MSG.challengeEmpty
      return t.length >= QUICK_CHALLENGE.min ? null : QUICK_MSG.challengeShort
    }
    case 'turnstile':
      return turnstile ? null : QUICK_MSG.turnstileMissing
  }
}

/** Field order is on-screen order: drives focus and the error summary. */
export const QUICK_FIELDS: QuickField[] = ['website', 'email', 'biggest_challenge', 'turnstile']

export function validateQuick(a: QuickAnswers, turnstile: string | null): Partial<Record<QuickField, string>> {
  const errors: Partial<Record<QuickField, string>> = {}
  for (const field of QUICK_FIELDS) {
    const message = validateQuickField(field, a, turnstile)
    if (message) errors[field] = message
  }
  return errors
}

/* ── Attribution ─────────────────────────────────────────────── */

export interface QuickAttribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  referrer?: string
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
export const ATTRIBUTION_STORAGE_KEY = 'hbee.growthReview.attribution.v1'

/** Referrer reduced to host + path: query strings can carry tokens and are never sent. */
export function referrerSummary(referrer: string, ownHost: string): string | undefined {
  if (!referrer) return undefined
  try {
    const url = new URL(referrer)
    if (url.hostname === ownHost) return undefined
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 300)
  } catch {
    return undefined
  }
}

/** UTM values and referrer from the landing URL. Pure; the caller supplies the inputs. */
export function readAttribution(search: string, referrer: string, ownHost: string): QuickAttribution {
  const params = new URLSearchParams(search)
  const out: QuickAttribution = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim()
    if (value) out[key] = value.slice(0, 120)
  }
  const ref = referrerSummary(referrer, ownHost)
  if (ref) out.referrer = ref
  return out
}

/**
 * Attribution for this visit. A landing URL that carries UTMs is remembered for
 * the tab session, so a visitor who browses and returns to the form is still
 * attributed to the campaign that brought them.
 */
export function resolveAttribution(
  search: string,
  referrer: string,
  ownHost: string,
  store: { get(): string | null; set(value: string): void },
): QuickAttribution {
  const fresh = readAttribution(search, referrer, ownHost)
  const hasUtm = UTM_KEYS.some((k) => fresh[k])
  if (hasUtm) {
    try {
      store.set(JSON.stringify(fresh))
    } catch {
      /* attribution still applies to this page view */
    }
    return fresh
  }
  try {
    const saved = store.get()
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        const out: QuickAttribution = {}
        for (const key of [...UTM_KEYS, 'referrer'] as const) {
          if (typeof parsed[key] === 'string' && parsed[key]) out[key] = String(parsed[key]).slice(0, 300)
        }
        if (Object.keys(out).length) return out
      }
    }
  } catch {
    /* ignore a malformed value */
  }
  return fresh
}

/** The request body. Honeypot is sent empty by design; the server checks it. */
export function buildQuickPayload(a: QuickAnswers, attribution: QuickAttribution, cta: string) {
  return {
    website: a.website.trim(),
    email: a.email.trim(),
    biggest_challenge: a.biggest_challenge.trim(),
    ...attribution,
    cta,
  }
}

/** Receipt marker written after a confirmed quick request; ReceivedState reads `kind`. */
export const QUICK_RECEIPT_KIND = 'request'
