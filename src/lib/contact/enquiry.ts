// src/lib/contact/enquiry.ts
//
// The Contact enquiry model (Phase 17), shared by the public form and the
// server validator so options, limits and rules cannot drift apart. Pure — no
// React, no server imports. The stored value of every option is its label.

export const ENQUIRY_TYPES = [
  'Starting a project',
  'Website / e-commerce support',
  'Creative / UGC',
  'Growth / marketing support',
  'Partnership / collaboration',
  'Existing client support',
  'Growth Review question',
  'General enquiry',
  'Something else',
] as const

/** No "Under $500" option, and no default selection. */
export const BUDGETS = [
  '$500 – $1,000',
  '$1,000 – $2,500',
  '$2,500 – $5,000',
  '$5,000 – $10,000',
  '$10,000 – $20,000',
  '$20,000+',
  'Not sure yet',
] as const

/** No default selection. */
export const TIMELINES = [
  'As soon as possible',
  'Within 1–2 weeks',
  'Within 2–4 weeks',
  'Within 1–2 months',
  'Within 2–3 months',
  'Just exploring for now',
] as const

export const ENQUIRY_LIMITS = {
  name: 200,
  email: 320,
  company: 200,
  website: 500,
  messageMin: 20,
  messageMax: 5000,
} as const

export const ENQUIRY_MESSAGES = {
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  enquiryType: 'Choose what you’re reaching out about.',
  message: 'Tell us a little about what you need.',
  website: 'Enter a valid website or store address.',
  failure: 'We couldn’t send your message right now. Please try again.',
} as const

// Same pattern the other public validators use.
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * Accepts what normal visitors type — hbeedigitals.com, www.hbeedigitals.com,
 * https://hbeedigitals.com — and returns a normalised https/http URL, or null.
 * Any non-http(s) scheme is rejected.
 */
export function normaliseWebsite(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value) || value.length > ENQUIRY_LIMITS.website) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
  if (hasScheme && !/^https?:\/\//i.test(value)) return null
  try {
    const url = new URL(hasScheme ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname
    if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

export interface EnquiryInput {
  name: string
  email: string
  company: string
  website: string
  enquiryType: string
  budget: string
  timeline: string
  message: string
}

export type EnquiryField = keyof EnquiryInput

/** Client-side field checks — the same rules the server enforces. */
export function enquiryFieldError(field: EnquiryField, v: EnquiryInput): string | null {
  switch (field) {
    case 'name':
      return v.name.trim() ? null : ENQUIRY_MESSAGES.name
    case 'email':
      return EMAIL_RE.test(v.email.trim().toLowerCase()) ? null : ENQUIRY_MESSAGES.email
    case 'enquiryType':
      return (ENQUIRY_TYPES as readonly string[]).includes(v.enquiryType) ? null : ENQUIRY_MESSAGES.enquiryType
    case 'message':
      return v.message.trim().length >= ENQUIRY_LIMITS.messageMin ? null : ENQUIRY_MESSAGES.message
    case 'website':
      return !v.website.trim() || normaliseWebsite(v.website) ? null : ENQUIRY_MESSAGES.website
    default:
      return null
  }
}
