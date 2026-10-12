/**
 * Cookie-consent storage contract, shared by the banners and analytics.
 *
 * The key and the two stored values are the ones the cookie banner has always
 * used, so a returning visitor's earlier choice keeps working unchanged.
 */

export const COOKIE_CONSENT_KEY = 'hbee_cookie_consent'
export type CookieConsentValue = 'accepted' | 'declined'

/** Fired on `window` after a choice is stored, so analytics can react without a reload. */
export const COOKIE_CONSENT_EVENT = 'hbee-cookie-consent'

export function readCookieConsent(): CookieConsentValue | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function storeCookieConsent(value: CookieConsentValue) {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value)
  } catch {
    /* the choice applies to this page view only */
  }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT))
}
