import { NEWSLETTER_CONSENT_VERSION, normalizedEmail } from './footer-settings'

export const NEWSLETTER_SUBSCRIBED_EVENT = 'hbee-newsletter-subscribed'
const DISMISSED_UNTIL = 'hbee:newsletter:dismissed-until'
const STARTED_AT = 'hbee:newsletter:started-at'
const SUBSCRIBED = 'hbee_subscribed' // existing popup contract
let memorySubscribed = false, memoryDismissedUntil = 0, memoryStartedAt: number | undefined

function read(storage: 'localStorage' | 'sessionStorage', key: string) {
  try { return window[storage].getItem(key) } catch { return null }
}
function write(storage: 'localStorage' | 'sessionStorage', key: string, value: string) {
  try { window[storage].setItem(key, value) } catch { /* Memory fallback lasts for this page encounter. */ }
}
export function markNewsletterSubscribed() {
  memorySubscribed = true
  write('localStorage', SUBSCRIBED, 'true')
  window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT))
}
export function dismissNewsletterPopup(now = Date.now()) {
  memoryDismissedUntil = now + 7 * 24 * 60 * 60 * 1000
  write('localStorage', DISMISSED_UNTIL, String(memoryDismissedUntil))
}
export function newsletterPopupSuppressed(now = Date.now()) {
  return memorySubscribed || Boolean(read('localStorage', SUBSCRIBED)) || Boolean(read('localStorage', 'hbee_popup_dismissed'))
    || Boolean(read('sessionStorage', 'hbee:popup:newsletter-2026-01:dismissed'))
    || Math.max(memoryDismissedUntil, Number(read('localStorage', DISMISSED_UNTIL)) || 0) > now
}
function startedAt(now: number) {
  if (memoryStartedAt === undefined) {
    const stored = Number(read('sessionStorage', STARTED_AT))
    memoryStartedAt = stored > 0 && stored <= now ? stored : now
    write('sessionStorage', STARTED_AT, String(memoryStartedAt))
  }
  return memoryStartedAt
}

/** Shared footer/popup transport; only an explicit successful API response sets suppression. */
export async function subscribeNewsletter(input: { email: string; consent: boolean; token: string; source: 'footer' | 'popup' }) {
  const email = normalizedEmail(input.email, true)
  if (!email) throw Error('Enter a valid email address.')
  if (input.consent !== true) throw Error('Please agree to receive Hbee Digitals insights and updates by email.')
  if (!input.token) throw Error('Please complete the security check.')
  const response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: input.source, consent: true, consent_version: NEWSLETTER_CONSENT_VERSION, turnstile_token: input.token }) })
  const result = await response.json().catch(() => null)
  if (!response.ok || result?.success !== true) throw Error(typeof result?.error === 'string' ? result.error : 'Subscription failed. Please try again.')
  markNewsletterSubscribed()
  return result.already_subscribed === true ? 'You are already subscribed.' : 'Thanks for subscribing. You can unsubscribe at any time.'
}

/** A single cancellable timer, surviving route changes through the existing tab's session storage. */
export function scheduleNewsletterPopup(options: {
  delaySeconds: number; canOpen: () => boolean; onOpen: () => void
  now?: () => number; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout
}) {
  const now = options.now || Date.now, setTimer = options.setTimer || setTimeout, clearTimer = options.clearTimer || clearTimeout
  const deadline = startedAt(now()) + Math.min(300, Math.max(180, options.delaySeconds)) * 1000
  let timer: ReturnType<typeof setTimeout> | undefined, cancelled = false
  function check() {
    if (cancelled || newsletterPopupSuppressed(now())) return
    if (options.canOpen()) options.onOpen()
    else timer = setTimer(check, 30_000) // wait for cookie controls/other dialogs/active forms
  }
  if (!newsletterPopupSuppressed(now())) timer = setTimer(check, Math.max(0, deadline - now()))
  return () => { cancelled = true; if (timer !== undefined) clearTimer(timer) }
}
