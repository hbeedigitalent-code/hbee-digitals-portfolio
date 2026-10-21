import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizedEmail } from '@/lib/footer-settings'

export const NEWSLETTER_UNSUBSCRIBE_SECRET_MIN_BYTES = 32
const SIGNATURE_CONTEXT = 'hbee-newsletter-unsubscribe-v1'
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i

function validatedSecret(secret: string | undefined) {
  if (!secret || Buffer.byteLength(secret, 'utf8') < NEWSLETTER_UNSUBSCRIBE_SECRET_MIN_BYTES) {
    throw Error('Newsletter unsubscribe signing is unavailable.')
  }
  return secret
}

function unsubscribeSecret() {
  return validatedSecret(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET)
}

export function newsletterUnsubscribeIdentity(raw: unknown) {
  return normalizedEmail(raw)
}

function signatureFor(identity: string, secret: string) {
  return createHmac('sha256', validatedSecret(secret))
    .update(`${SIGNATURE_CONTEXT}\n${identity}`, 'utf8')
    .digest('hex')
}

export function signNewsletterUnsubscribeIdentity(rawEmail: unknown, secret = unsubscribeSecret()) {
  const email = newsletterUnsubscribeIdentity(rawEmail)
  if (!email) throw Error('A valid subscriber email is required for unsubscribe signing.')
  return { email, signature: signatureFor(email, secret) }
}

export function verifyNewsletterUnsubscribeIdentity(rawEmail: unknown, rawSignature: unknown, secret = unsubscribeSecret()) {
  const email = newsletterUnsubscribeIdentity(rawEmail)
  if (!email || typeof rawSignature !== 'string' || !SIGNATURE_PATTERN.test(rawSignature)) return null
  const expected = Buffer.from(signatureFor(email, secret), 'hex')
  const supplied = Buffer.from(rawSignature, 'hex')
  return expected.length === supplied.length && timingSafeEqual(expected, supplied) ? email : null
}

export function createNewsletterUnsubscribeUrl(siteUrl: string, rawEmail: unknown, secret = unsubscribeSecret()) {
  const identity = signNewsletterUnsubscribeIdentity(rawEmail, secret)
  const url = new URL('/unsubscribe', siteUrl)
  url.searchParams.set('email', identity.email)
  url.searchParams.set('signature', identity.signature)
  return url.toString()
}
