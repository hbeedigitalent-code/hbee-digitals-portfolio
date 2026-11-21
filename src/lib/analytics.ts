import { readCookieConsent } from '@/lib/cookie-consent'
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

type SubmissionAcknowledgement = {
  responseOk: boolean
  success: unknown
  duplicate?: unknown
}

type ConversionName = 'growth_review_submitted' | 'contact_form_submitted'
type ConversionContext = 'growth_review' | 'contact'

const RECEIPT_PREFIX = 'hbee:ga4-conversion:v1:'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sentThisPage = new Set<string>()

function storageHas(storage: Storage, key: string): boolean {
  try {
    return storage.getItem(key) === 'sent'
  } catch {
    return false
  }
}

function storageMark(storage: Storage, key: string): void {
  try {
    storage.setItem(key, 'sent')
  } catch {
    // The in-memory receipt still prevents duplicate calls during this page view.
  }
}

function sendConversion(name: ConversionName, context: ConversionContext, receiptId: string): boolean {
  if (typeof window === 'undefined' || readCookieConsent() !== 'accepted') return false
  if (typeof window.gtag !== 'function' || !UUID_RE.test(receiptId)) return false

  const receipt = `${RECEIPT_PREFIX}${name}:${receiptId}`
  if (
    sentThisPage.has(receipt) ||
    storageHas(window.localStorage, receipt) ||
    storageHas(window.sessionStorage, receipt)
  ) {
    return false
  }

  // Mark before queueing so a synchronous rerender/callback cannot send twice.
  sentThisPage.add(receipt)
  storageMark(window.localStorage, receipt)
  storageMark(window.sessionStorage, receipt)

  window.gtag('event', name, {
    form_name: context,
    conversion_type: context,
  })
  return true
}

function isNewSuccessfulSubmission(acknowledgement: SubmissionAcknowledgement): boolean {
  return (
    acknowledgement.responseOk &&
    acknowledgement.success === true &&
    acknowledgement.duplicate !== true
  )
}

export function trackGrowthReviewSubmission(
  acknowledgement: SubmissionAcknowledgement,
  submissionKey: string,
): boolean {
  if (!isNewSuccessfulSubmission(acknowledgement)) return false
  return sendConversion('growth_review_submitted', 'growth_review', submissionKey)
}

/* ── Free Growth Review request (short campaign form) ──────────────────────────
 *
 * A SEPARATE funnel from the full assessment above, so reporting can tell them
 * apart: growth_review_request_started / growth_review_request_submitted vs.
 * growth_review_submitted. Same consent gate, same GA4 loader.
 *
 * NO PII: only campaign attribution and the CTA location are sent — never the
 * email address, the store URL or the visitor's answer.
 */

export interface RequestAnalyticsContext {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  /** Where on the page the visitor started: 'hero' | 'final_cta' ... */
  cta_location?: string
}

const REQUEST_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'cta_location'] as const
const startedThisPage = new Set<string>()

function requestParams(context: RequestAnalyticsContext): Record<string, string> {
  const params: Record<string, string> = { form_name: 'growth_review_request', conversion_type: 'growth_review_request' }
  for (const key of REQUEST_PARAM_KEYS) {
    const value = context[key]
    if (typeof value === 'string' && value) params[key] = value.slice(0, 100)
  }
  return params
}

/** Once per page view, on the visitor's first interaction with the short form. */
export function trackGrowthReviewRequestStarted(context: RequestAnalyticsContext): boolean {
  if (typeof window === 'undefined' || readCookieConsent() !== 'accepted') return false
  if (typeof window.gtag !== 'function' || startedThisPage.has('started')) return false
  startedThisPage.add('started')
  window.gtag('event', 'growth_review_request_started', requestParams(context))
  return true
}

/** A NEW successful request only — a duplicate acknowledgement is never counted twice. */
export function trackGrowthReviewRequestSubmitted(
  acknowledgement: SubmissionAcknowledgement,
  submissionKey: string,
  context: RequestAnalyticsContext,
): boolean {
  if (!isNewSuccessfulSubmission(acknowledgement)) return false
  if (typeof window === 'undefined' || readCookieConsent() !== 'accepted') return false
  if (typeof window.gtag !== 'function' || !UUID_RE.test(submissionKey)) return false

  const receipt = `${RECEIPT_PREFIX}growth_review_request_submitted:${submissionKey}`
  if (sentThisPage.has(receipt) || storageHas(window.localStorage, receipt) || storageHas(window.sessionStorage, receipt)) {
    return false
  }
  sentThisPage.add(receipt)
  storageMark(window.localStorage, receipt)
  storageMark(window.sessionStorage, receipt)
  window.gtag('event', 'growth_review_request_submitted', requestParams(context))
  return true
}

export function trackContactFormSubmission(
  acknowledgement: SubmissionAcknowledgement,
  submissionKey: string,
): boolean {
  if (!isNewSuccessfulSubmission(acknowledgement)) return false
  return sendConversion('contact_form_submitted', 'contact', submissionKey)
}
