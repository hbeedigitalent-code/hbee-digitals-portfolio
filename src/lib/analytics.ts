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

export function trackContactFormSubmission(
  acknowledgement: SubmissionAcknowledgement,
  submissionKey: string,
): boolean {
  if (!isNewSuccessfulSubmission(acknowledgement)) return false
  return sendConversion('contact_form_submitted', 'contact', submissionKey)
}
