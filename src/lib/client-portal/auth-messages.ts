// src/lib/client-portal/auth-messages.ts
//
// Pure. Client-facing wording for sign-in and password-reset failures.
//
// Supabase's own error text ("Invalid login credentials", "AuthApiError: ...") is written for developers. The portal shows
// one of a small set of plain sentences instead. The mapping reads only the error's code, status and message to CHOOSE a
// sentence; the raw text is never displayed. The credentials wording is deliberately the same for an unknown address and a
// wrong password, so the form never confirms whether an email has an account.

export const LOGIN_MESSAGES = {
  credentials: "That email and password don't match. Check them and try again, or reset your password.",
  unconfirmed: 'Please confirm your email address first. Check your inbox for the confirmation link.',
  rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
  network: "We couldn't reach the server. Check your connection and try again.",
  generic: "We couldn't sign you in. Please try again, or contact Hbee Digitals if it keeps happening.",
} as const

export const RESET_MESSAGES = {
  emailRequired: 'Please enter your email address.',
  rateLimited: 'Too many reset requests. Please wait a few minutes and try again.',
  network: LOGIN_MESSAGES.network,
  generic: "We couldn't send the reset email. Please try again in a moment.",
} as const

interface Shaped { code?: unknown; status?: unknown; message?: unknown; name?: unknown }

function facts(err: unknown): { code: string; status: number; message: string; isFetchFailure: boolean } {
  const e = (err && typeof err === 'object' ? err : {}) as Shaped
  return {
    code: typeof e.code === 'string' ? e.code.toLowerCase() : '',
    status: typeof e.status === 'number' ? e.status : 0,
    message: typeof e.message === 'string' ? e.message.toLowerCase() : '',
    isFetchFailure: err instanceof TypeError || /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(String(e.message ?? '')),
  }
}

const isRateLimited = (f: ReturnType<typeof facts>) =>
  f.status === 429 || f.code === 'over_request_rate_limit' || f.code === 'over_email_send_rate_limit' || /rate limit|too many/.test(f.message)

export function friendlyLoginError(err: unknown): string {
  const f = facts(err)
  if (f.code === 'email_not_confirmed' || /email not confirmed/.test(f.message)) return LOGIN_MESSAGES.unconfirmed
  if (isRateLimited(f)) return LOGIN_MESSAGES.rateLimited
  if (f.code === 'invalid_credentials' || /invalid login credentials|invalid credentials/.test(f.message)) return LOGIN_MESSAGES.credentials
  if (f.isFetchFailure) return LOGIN_MESSAGES.network
  return LOGIN_MESSAGES.generic
}

export function friendlyResetError(err: unknown): string {
  const f = facts(err)
  if (isRateLimited(f)) return RESET_MESSAGES.rateLimited
  if (f.isFetchFailure) return RESET_MESSAGES.network
  return RESET_MESSAGES.generic
}
