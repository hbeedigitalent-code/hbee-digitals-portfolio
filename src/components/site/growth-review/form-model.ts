/**
 * Growth Review form model (Phase 16.4): answers, validation, the submission
 * payload, and the draft / receipt storage policy. Pure — no React — so the
 * rules can be exercised directly in tests.
 *
 * PAYLOAD CONTRACT: buildPayload() sends exactly the keys the hardened
 * POST /api/growth-assessment accepts. The fields deliberately left out of the
 * shortened assessment (success_vision, main_obstacle, best_channel,
 * paid_ads_usage, paid_ad_platforms) are ABSENT — never '' or a placeholder.
 * store_age is absent for the Planning stage (see storeAgeApplies).
 */

import { exactCountry, isCountry } from './countries'
import { CHALLENGE, GOALS, IN_PLACE_ROWS, MAX_GOALS, MSG, type InPlaceField } from './growth-review-content'

export interface Answers {
  business_name: string
  website: string
  contact_name: string
  email: string
  country: string
  industry: string
  business_stage: string
  store_age: string
  marketing_channels: string[]
  email_capture: string
  email_automations: string
  customer_reviews: string
  upsells_crosssells: string
  content_publishing: string
  /** No default: null until the visitor chooses (Phase 16.3 §12). */
  visibility_confidence: number | null
  primary_goals: string[]
  biggest_challenge: string
  support_type: string
  improvement_timeline: string
}

export type FieldKey = keyof Answers | 'consent' | 'turnstile'

export const EMPTY_ANSWERS: Answers = {
  business_name: '',
  website: '',
  contact_name: '',
  email: '',
  country: '',
  industry: '',
  business_stage: '',
  store_age: '',
  marketing_channels: [],
  email_capture: '',
  email_automations: '',
  customer_reviews: '',
  upsells_crosssells: '',
  content_publishing: '',
  visibility_confidence: null,
  primary_goals: [],
  biggest_challenge: '',
  support_type: '',
  improvement_timeline: '',
}

/** The fields each section owns, in on-screen order (drives focus and the error summary). */
export const SECTION_FIELDS: FieldKey[][] = [
  ['business_name', 'website', 'contact_name', 'email', 'country', 'industry'],
  [
    'business_stage',
    'store_age',
    'marketing_channels',
    'email_capture',
    'email_automations',
    'customer_reviews',
    'upsells_crosssells',
    'content_publishing',
    'visibility_confidence',
  ],
  ['primary_goals'],
  ['biggest_challenge'],
  ['support_type', 'improvement_timeline', 'consent', 'turnstile'],
]

// Same pattern the server enforces (assessment-payload.ts).
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Accepts store.com, https://store.com and http://store.com — what the server normalises. */
export function isValidWebsite(raw: string): boolean {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return false
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
  if (hasScheme && !/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(hasScheme ? value : `https://${value}`)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.') && !url.hostname.startsWith('.') && !url.hostname.endsWith('.')
  } catch {
    return false
  }
}

/**
 * Planning businesses have not started selling, so the store-age question is
 * hidden, not required and left out of the payload (Phase 16.4.2). The server
 * applies the same rule (assessment-payload.ts).
 */
export const STORE_AGE_OPTIONAL_STAGE = 'Planning'
export function storeAgeApplies(a: Pick<Answers, 'business_stage'>): boolean {
  return a.business_stage !== STORE_AGE_OPTIONAL_STAGE
}

/**
 * The one place a business-stage change is applied. Moving to Planning clears
 * any store-age answer at once, so a stale value can't linger in state, the
 * draft or the payload — and moving back to a selling stage starts it blank.
 */
export function withBusinessStage(a: Answers, stage: string): Answers {
  const next = { ...a, business_stage: stage }
  if (!storeAgeApplies(next)) next.store_age = ''
  return next
}

const GOAL_VALUES = new Set(GOALS.map((g) => g.value))

export function validateField(field: FieldKey, a: Answers, extra: { consent: boolean; turnstile: string | null }): string | null {
  switch (field) {
    case 'business_name':
      return a.business_name.trim() ? null : MSG.business_name
    case 'contact_name':
      return a.contact_name.trim() ? null : MSG.contact_name
    case 'email':
      if (!a.email.trim()) return MSG.emailEmpty
      return EMAIL_RE.test(a.email.trim().toLowerCase()) ? null : MSG.emailInvalid
    case 'website':
      if (!a.website.trim()) return MSG.websiteEmpty
      return isValidWebsite(a.website) ? null : MSG.websiteInvalid
    case 'country':
      return isCountry(a.country) ? null : MSG.country
    case 'industry':
      return a.industry ? null : MSG.industry
    case 'store_age':
      if (!storeAgeApplies(a)) return null
      return a.store_age ? null : MSG.choose
    case 'business_stage':
    case 'content_publishing':
    case 'support_type':
    case 'improvement_timeline':
      return a[field] ? null : MSG.choose
    case 'marketing_channels':
      return a.marketing_channels.length ? null : MSG.channels
    case 'email_capture':
    case 'email_automations':
    case 'customer_reviews':
    case 'upsells_crosssells':
      return a[field] ? null : MSG.inPlace(IN_PLACE_ROWS.find((r) => r.field === (field as InPlaceField))!.label)
    case 'visibility_confidence': {
      const n = a.visibility_confidence
      return n !== null && Number.isInteger(n) && n >= 1 && n <= 10 ? null : MSG.confidence
    }
    case 'primary_goals':
      if (!a.primary_goals.length) return MSG.goalsNone
      if (a.primary_goals.length > MAX_GOALS) return MSG.goalsMax
      return a.primary_goals.every((g) => GOAL_VALUES.has(g)) ? null : MSG.goalsNone
    case 'biggest_challenge': {
      const t = a.biggest_challenge.trim()
      if (!t) return MSG.challengeEmpty
      return t.length >= CHALLENGE.min ? null : MSG.challengeShort
    }
    case 'consent':
      return extra.consent ? null : MSG.consent
    case 'turnstile':
      return extra.turnstile ? null : MSG.turnstileMissing
    default:
      return null
  }
}

export function validateSection(index: number, a: Answers, extra: { consent: boolean; turnstile: string | null }) {
  const errors: Partial<Record<FieldKey, string>> = {}
  for (const field of SECTION_FIELDS[index]) {
    const message = validateField(field, a, extra)
    if (message) errors[field] = message
  }
  return errors
}

/** The exact request body. Optional/omitted answers are absent, not blank. */
export function buildPayload(a: Answers) {
  return {
    business_name: a.business_name.trim(),
    website: a.website.trim(),
    contact_name: a.contact_name.trim(),
    email: a.email.trim(),
    country: a.country,
    industry: a.industry,
    business_stage: a.business_stage,
    ...(storeAgeApplies(a) ? { store_age: a.store_age } : {}),
    primary_goals: [...a.primary_goals],
    marketing_channels: [...a.marketing_channels],
    visibility_confidence: a.visibility_confidence,
    email_capture: a.email_capture,
    email_automations: a.email_automations,
    customer_reviews: a.customer_reviews,
    content_publishing: a.content_publishing,
    upsells_crosssells: a.upsells_crosssells,
    biggest_challenge: a.biggest_challenge.trim(),
    support_type: a.support_type,
    improvement_timeline: a.improvement_timeline,
    consent: true as const,
  }
}

/** Stable fingerprint of what would be sent — binds a submission key to its answers. */
export function answersHash(a: Answers): string {
  const text = JSON.stringify(buildPayload(a))
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${text.length.toString(36)}.${(h >>> 0).toString(36)}`
}

export function newSubmissionKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/* ── Draft (Phase 16.3 §20–21) ───────────────────────────────── */

export const DRAFT_KEY = 'hbee.growthReview.draft.v1'
export const DRAFT_VERSION = 1
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export interface Draft {
  version: number
  savedAt: number
  section: number
  answers: Answers
  /** Submission reference metadata: the key, bound to the answers it was made for. */
  submission: { key: string; hash: string } | null
}

/** The answers as written to storage: for Planning the store_age key is left out, not kept blank (readDraft restores it as ''). */
export function draftAnswers(a: Answers): Omit<Answers, 'store_age'> & { store_age?: string } {
  if (storeAgeApplies(a)) return a
  const { store_age: _omitted, ...rest } = a
  return rest
}

/** Coerce a stored draft back into a safe shape; null if unusable or expired. Never throws. */
export function readDraft(raw: string | null, now = Date.now()): Draft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw)
    if (!d || d.version !== DRAFT_VERSION || typeof d.savedAt !== 'number' || now - d.savedAt > DRAFT_TTL_MS || now < d.savedAt - 60_000) return null
    const src = d.answers && typeof d.answers === 'object' ? d.answers : {}
    const answers: Answers = { ...EMPTY_ANSWERS }
    for (const key of Object.keys(EMPTY_ANSWERS) as (keyof Answers)[]) {
      const v = src[key]
      const empty = EMPTY_ANSWERS[key]
      if (Array.isArray(empty)) {
        if (Array.isArray(v)) (answers as any)[key] = v.filter((x: unknown) => typeof x === 'string').slice(0, 25)
      } else if (key === 'visibility_confidence') {
        answers.visibility_confidence = Number.isInteger(v) && v >= 1 && v <= 10 ? v : null
      } else if (typeof v === 'string') {
        ;(answers as any)[key] = v.slice(0, key === 'biggest_challenge' ? CHALLENGE.max : 500)
      }
    }
    if (!storeAgeApplies(answers)) answers.store_age = ''
    if (answers.country && !isCountry(answers.country)) answers.country = exactCountry(answers.country) ?? ''
    if (answers.primary_goals.length > MAX_GOALS) answers.primary_goals = answers.primary_goals.slice(0, MAX_GOALS)
    const section = Number.isInteger(d.section) && d.section >= 0 && d.section <= 4 ? d.section : 0
    const submission =
      d.submission && typeof d.submission.key === 'string' && typeof d.submission.hash === 'string'
        ? { key: d.submission.key, hash: d.submission.hash }
        : null
    return { version: DRAFT_VERSION, savedAt: d.savedAt, section, answers, submission }
  } catch {
    return null
  }
}

export function hasAnyAnswer(a: Answers): boolean {
  return (Object.keys(a) as (keyof Answers)[]).some((k) => {
    const v = a[k]
    return Array.isArray(v) ? v.length > 0 : v !== null && v !== ''
  })
}

/* ── Receipt marker (Phase 16.4 confirmation gate) ───────────── */

export const RECEIPT_KEY = 'hbee.growthReview.received'
export const RECEIPT_TTL_MS = 2 * 60 * 60 * 1000

export function receiptIsValid(raw: string | null, now = Date.now()): boolean {
  if (!raw) return false
  try {
    const r = JSON.parse(raw)
    return typeof r?.at === 'number' && now >= r.at - 60_000 && now - r.at < RECEIPT_TTL_MS
  } catch {
    return false
  }
}
