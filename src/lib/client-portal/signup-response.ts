// src/lib/client-portal/signup-response.ts
//
// Pure. Decides what the signup form is allowed to say about a failed sign-up.
//
// WHY: an error such as "User already registered" tells anyone who can type an email address whether that
// address already has an account — account enumeration. The signup response must read the same whether the
// address is new or already registered. Everything that identifies an existing account is therefore folded
// into the SAME success wording, and nothing else about the address is ever echoed back.
//
// Legitimate paths are untouched: a real owner of the address can still sign in, or reset their password from
// the login page, and the neutral wording points them there.

export type SignUpFailureKind = 'already_registered' | 'password_policy' | 'rate_limited' | 'invalid_email' | 'generic'

export const SIGNUP_NEUTRAL_MESSAGE =
  'If this email can be used for a new account, we have sent a confirmation link to it. If you already have an account, sign in or reset your password instead.'

export const SIGNUP_GENERIC_ERROR = 'We could not create your account. Please check your details and try again.'

export function classifySignUpError(error: { message?: unknown; code?: unknown; status?: unknown } | null | undefined): SignUpFailureKind {
  const code = typeof error?.code === 'string' ? error.code.toLowerCase() : ''
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : ''
  const status = typeof error?.status === 'number' ? error.status : 0

  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code === 'identity_already_exists' ||
    /already\s+(been\s+)?registered|already\s+exists|already\s+in\s+use|email\s+exists/.test(message)
  ) {
    return 'already_registered'
  }
  if (code === 'weak_password' || /password\s+(should|must)|weak\s+password/.test(message)) return 'password_policy'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429 || /rate\s*limit|too many/.test(message)) {
    return 'rate_limited'
  }
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/.test(message)) return 'invalid_email'
  return 'generic'
}

export interface SignUpOutcome {
  success: boolean
  message?: string
  error?: string
}

/** The only wording a failed sign-up may surface to the browser. */
export function signUpOutcomeFor(error: { message?: unknown; code?: unknown; status?: unknown }): SignUpOutcome {
  switch (classifySignUpError(error)) {
    case 'already_registered':
      // Indistinguishable from a brand-new sign-up.
      return { success: true, message: SIGNUP_NEUTRAL_MESSAGE }
    case 'password_policy':
      return { success: false, error: 'Please choose a stronger password (at least 6 characters).' }
    case 'rate_limited':
      return { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' }
    case 'invalid_email':
      return { success: false, error: 'Please enter a valid email address.' }
    default:
      return { success: false, error: SIGNUP_GENERIC_ERROR }
  }
}
