/**
 * Pure model for the BFCM Readiness Checklist page: tick state, progress,
 * the Growth Review link that carries campaign attribution, and request-form
 * validation. No React, no network, no database: tick state lives only in the
 * visitor's browser (localStorage) and is never sent anywhere.
 */

import { CHECKLIST_ITEMS, CHECKLIST_TOTAL } from './checklist-content'
import { isValidWebsite } from '../growth-review/form-model'
import { CL_MSG } from './checklist-content'
import type { QuickAttribution } from '../growth-review/quick-form-model'

export const CHECKLIST_STORAGE_KEY = 'hbee.bfcmChecklist.ticks.v1'
export const CHECKLIST_SUBMIT_URL = '/api/bfcm-checklist-request'

const VALID_NUMBERS = new Set(CHECKLIST_ITEMS.map((i) => i.number))

/** Ticked item numbers, kept in checklist order. Unknown values are dropped. */
export function normaliseTicks(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const set = new Set(input.filter((v): v is string => typeof v === 'string' && VALID_NUMBERS.has(v)))
  return CHECKLIST_ITEMS.map((i) => i.number).filter((n) => set.has(n))
}

export function toggleTick(ticks: string[], number: string): string[] {
  if (!VALID_NUMBERS.has(number)) return ticks
  return normaliseTicks(ticks.includes(number) ? ticks.filter((n) => n !== number) : [...ticks, number])
}

export function readTicks(raw: string | null): string[] {
  if (!raw) return []
  try {
    return normaliseTicks(JSON.parse(raw))
  } catch {
    return []
  }
}

export function progress(ticks: string[]): { done: number; total: number; percent: number } {
  const done = normaliseTicks(ticks).length
  return { done, total: CHECKLIST_TOTAL, percent: Math.round((done / CHECKLIST_TOTAL) * 100) }
}

/**
 * The Growth Review link from this page. It carries the visit's campaign
 * attribution forward (source, medium, campaign) and stamps utm_content with
 * the hop, so a Growth Review lead can be traced back to the checklist. Only
 * campaign labels travel: never the email address, the store URL or any tick.
 */
export function growthReviewHref(attribution: QuickAttribution = {}): string {
  const params = new URLSearchParams()
  if (attribution.utm_source) params.set('utm_source', attribution.utm_source)
  else params.set('utm_source', 'bfcm_checklist')
  if (attribution.utm_medium) params.set('utm_medium', attribution.utm_medium)
  else params.set('utm_medium', 'website')
  if (attribution.utm_campaign) params.set('utm_campaign', attribution.utm_campaign)
  params.set('utm_content', 'checklist_to_growth_review')
  return `/growth-review?${params.toString()}`
}

// Same pattern the server enforces.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export interface RequestAnswers {
  email: string
  website: string
}

export type RequestField = 'email' | 'website' | 'turnstile'

export function validateRequestField(field: RequestField, a: RequestAnswers, turnstile: string | null): string | null {
  switch (field) {
    case 'email':
      if (!a.email.trim()) return CL_MSG.emailEmpty
      return EMAIL_RE.test(a.email.trim().toLowerCase()) ? null : CL_MSG.emailInvalid
    case 'website':
      return !a.website.trim() || isValidWebsite(a.website) ? null : CL_MSG.website
    case 'turnstile':
      return turnstile ? null : CL_MSG.turnstileMissing
  }
}

export const REQUEST_FIELDS: RequestField[] = ['email', 'website', 'turnstile']

export function validateRequest(a: RequestAnswers, turnstile: string | null): Partial<Record<RequestField, string>> {
  const errors: Partial<Record<RequestField, string>> = {}
  for (const f of REQUEST_FIELDS) {
    const m = validateRequestField(f, a, turnstile)
    if (m) errors[f] = m
  }
  return errors
}

/** The request body. The store URL is omitted when blank. Honeypot is added by the form. */
export function buildRequestPayload(a: RequestAnswers, attribution: QuickAttribution, cta: string) {
  return {
    email: a.email.trim(),
    ...(a.website.trim() ? { website: a.website.trim() } : {}),
    ...attribution,
    cta,
  }
}
