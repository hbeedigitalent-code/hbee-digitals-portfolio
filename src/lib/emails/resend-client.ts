// src/lib/emails/resend-client.ts
//
// The one place a Resend client is constructed, and only when an email is actually about to be sent.
//
// WHY: `new Resend(undefined)` throws "Missing API key". Constructing the client at module scope therefore made `next build` fail
// ("Collecting page data") on any environment without RESEND_API_KEY — every Vercel Preview — merely because a route imported an
// email helper. Constructing it here, at send time, keeps the build independent of the key.
//
// BEHAVIOUR: with the key set, this returns a real client (one cached instance per key) and sending is unchanged. Without it, it throws
// EmailConfigurationError. Every caller already sends inside `deliver()` or its own try/catch, so the result is a logged server-side
// configuration error and a contained "not sent" outcome — never a fake success, and never a message that exposes configuration.

import { Resend } from 'resend'
import { EmailConfigurationError } from '@/lib/emails/layout'

let cached: { key: string; client: Resend } | null = null

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new EmailConfigurationError('missing_api_key', 'RESEND_API_KEY is not configured')
  if (!cached || cached.key !== key) cached = { key, client: new Resend(key) }
  return cached.client
}
