// src/lib/validators/contact-payload.ts
//
// SERVER-SIDE strict validation for the public contact endpoint.
//
// /api/contact is reached by two different forms with two different field
// shapes — ContactSection.tsx posts `fullName`/`company`/`website`, while
// ConsultationPopup.tsx posts `full_name`/`business_name`/`website_url` with
// form_type 'free_consultation'. The route previously reconciled those inline
// with a chain of `body.x || body.y || ''` fallbacks and checked only that three
// values were non-empty.
//
// This module takes over that reconciliation AND validates it, so the route is
// left with one call and a canonical result.
//
// Like assessment-payload.ts, it REBUILDS the payload from known keys rather
// than filtering the request object. A field the caller invents is dropped
// rather than carried forward, so nothing unexpected can reach a database
// column — the Turnstile token included, which is consumed by the route and is
// not a field name below.

import {
  BUDGETS,
  ENQUIRY_LIMITS,
  ENQUIRY_MESSAGES,
  ENQUIRY_TYPES,
  TIMELINES,
  normaliseWebsite as normaliseEnquiryWebsite,
} from '@/lib/contact/enquiry'

/**
 * 'enquiry' is the rebuilt Contact page (Phase 17). The two legacy forms keep
 * 'contact' and 'free_consultation' with their behaviour unchanged.
 */
export type ContactFormType = 'contact' | 'free_consultation' | 'enquiry'

/** Exactly the columns the route writes to `contact_submissions`, plus enquiry-only fields. */
export interface ValidatedContact {
  form_type: ContactFormType
  source: string
  full_name: string
  email: string
  company: string | null
  phone: string | null
  website: string | null
  service: string | null
  message: string
  /** Enquiry only. Optional answers are absent (never ''). */
  enquiry?: {
    enquiryType: (typeof ENQUIRY_TYPES)[number]
    budget?: (typeof BUDGETS)[number]
    timeline?: (typeof TIMELINES)[number]
    /** Client-generated UUID for this attempt; used only to de-duplicate emails on retry. */
    submissionKey?: string
  }
}

export type ContactValidationOutcome =
  | { ok: true; value: ValidatedContact }
  | { ok: false; error: string }

const MAX_LENGTHS = {
  full_name: 200,
  email: 320, // RFC 5321 maximum
  company: 200,
  phone: 50,
  website: 500,
  service: 200,
  source: 120,
  message: 5000,
} as const

/** Shortest message accepted. Below this it is noise, not an enquiry. */
const MIN_MESSAGE_LENGTH = 5

// Conservative but permissive enough for real addresses. Deliberately not an
// RFC-complete pattern — the confirmation email is the real proof of address.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Digits, spaces and the punctuation real phone numbers actually contain. */
const PHONE_RE = /^[+()\-.\s\d]{5,50}$/

const FORM_TYPES: readonly ContactFormType[] = ['contact', 'free_consultation', 'enquiry']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** The rebuilt Contact page's enquiry. Allow-listed choices; optional answers absent, never ''. */
function validateEnquiry(input: Record<string, unknown>): ContactValidationOutcome {
  const fullName = pick(input, 'full_name', 'name')
  if (!fullName || fullName.length > ENQUIRY_LIMITS.name) return { ok: false, error: ENQUIRY_MESSAGES.name }

  const email = pick(input, 'email').toLowerCase()
  if (!email || email.length > ENQUIRY_LIMITS.email || !EMAIL_RE.test(email)) {
    return { ok: false, error: ENQUIRY_MESSAGES.email }
  }

  const enquiryType = pick(input, 'enquiry_type')
  if (!(ENQUIRY_TYPES as readonly string[]).includes(enquiryType)) {
    return { ok: false, error: ENQUIRY_MESSAGES.enquiryType }
  }

  const message = pick(input, 'message')
  if (message.length < ENQUIRY_LIMITS.messageMin) return { ok: false, error: ENQUIRY_MESSAGES.message }
  if (message.length > ENQUIRY_LIMITS.messageMax) {
    return { ok: false, error: 'That message is too long. Please shorten it and try again.' }
  }

  const company = pick(input, 'company')
  if (company.length > ENQUIRY_LIMITS.company) return { ok: false, error: 'That business name is too long.' }

  const rawWebsite = pick(input, 'website')
  let website: string | null = null
  if (rawWebsite) {
    website = normaliseEnquiryWebsite(rawWebsite)
    if (!website) return { ok: false, error: ENQUIRY_MESSAGES.website }
  }

  // Optional choices: absent or blank → omitted; anything else must be an allowed option.
  const budget = pick(input, 'budget')
  if (budget && !(BUDGETS as readonly string[]).includes(budget)) {
    return { ok: false, error: 'That budget option is not valid.' }
  }
  const timeline = pick(input, 'timeline')
  if (timeline && !(TIMELINES as readonly string[]).includes(timeline)) {
    return { ok: false, error: 'That timeline option is not valid.' }
  }

  const submissionKey = pick(input, 'submission_key')

  return {
    ok: true,
    value: {
      form_type: 'enquiry',
      source: 'contact_page',
      full_name: fullName,
      email,
      company: company || null,
      phone: null,
      website,
      service: enquiryType,
      message,
      enquiry: {
        enquiryType: enquiryType as (typeof ENQUIRY_TYPES)[number],
        ...(budget ? { budget: budget as (typeof BUDGETS)[number] } : {}),
        ...(timeline ? { timeline: timeline as (typeof TIMELINES)[number] } : {}),
        ...(UUID_RE.test(submissionKey) ? { submissionKey: submissionKey.toLowerCase() } : {}),
      },
    },
  }
}

/**
 * Strips control characters and normalises whitespace. Tab and newline survive
 * so multi-line messages stay readable; everything else in the C0/C1 control
 * range is removed before the value can reach storage or an email.
 *
 * Identical in behaviour to the `clean()` in assessment-payload.ts.
 */
function clean(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** First non-empty string among the candidates, cleaned. */
function pick(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const raw = input[key]
    if (typeof raw === 'string') {
      const value = clean(raw)
      if (value) return value
    }
  }
  return ''
}

/**
 * Accepts a bare domain or an http/https URL. Any other scheme is rejected —
 * a `javascript:` or `data:` value would otherwise be stored and later rendered
 * as a link in the admin inbox view.
 */
function normaliseWebsite(raw: string): string | null {
  const value = clean(raw)
  if (!value) return null
  if (value.length > MAX_LENGTHS.website) return null

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

export function validateContactPayload(
  input: Record<string, unknown>,
): ContactValidationOutcome {
  // --- form_type -----------------------------------------------------------
  // Unrecognised values fall back to 'contact' rather than erroring: the field
  // only selects wording and is not a security decision, and rejecting it would
  // break the form for a caller sending a legacy value.
  const rawFormType = typeof input.form_type === 'string' ? clean(input.form_type) : ''
  const formType: ContactFormType = FORM_TYPES.includes(rawFormType as ContactFormType)
    ? (rawFormType as ContactFormType)
    : 'contact'

  if (formType === 'enquiry') return validateEnquiry(input)

  const source = pick(input, 'source').slice(0, MAX_LENGTHS.source) ||
    (formType === 'free_consultation' ? 'consultation_popup' : 'website_contact_form')

  // --- required ------------------------------------------------------------
  const fullName = pick(input, 'full_name', 'fullName', 'name')
  if (!fullName) {
    return { ok: false, error: 'Please enter your name.' }
  }
  if (fullName.length > MAX_LENGTHS.full_name) {
    return { ok: false, error: 'That name is too long.' }
  }

  const email = pick(input, 'email').toLowerCase()
  if (!email) {
    return { ok: false, error: 'Please enter your email address.' }
  }
  if (email.length > MAX_LENGTHS.email || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }

  // The consultation popup sends the same text as both `current_challenge` and
  // `message`; the contact form sends only `message`.
  const message = pick(input, 'message', 'current_challenge')
  if (!message) {
    return { ok: false, error: 'Please enter a message.' }
  }
  if (message.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, error: 'Please tell us a little more about what you need.' }
  }
  if (message.length > MAX_LENGTHS.message) {
    return { ok: false, error: 'That message is too long. Please shorten it and try again.' }
  }

  // --- optional ------------------------------------------------------------
  const company = pick(input, 'business_name', 'company')
  if (company.length > MAX_LENGTHS.company) {
    return { ok: false, error: 'That business name is too long.' }
  }

  const phone = pick(input, 'phone')
  if (phone && !PHONE_RE.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number.' }
  }

  const service = pick(input, 'service_interest', 'service')
  if (service.length > MAX_LENGTHS.service) {
    return { ok: false, error: 'That service selection is not valid.' }
  }

  // An unparseable website is rejected rather than silently dropped, so the
  // visitor can correct a typo instead of losing the value without being told.
  const rawWebsite = pick(input, 'website_url', 'website')
  let website: string | null = null
  if (rawWebsite) {
    website = normaliseWebsite(rawWebsite)
    if (!website) {
      return { ok: false, error: 'Please enter a valid website address, or leave it blank.' }
    }
  }

  return {
    ok: true,
    value: {
      form_type: formType,
      source,
      full_name: fullName,
      email,
      company: company || null,
      phone: phone || null,
      website,
      service: service || null,
      message,
    },
  }
}
