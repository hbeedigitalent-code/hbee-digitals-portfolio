/**
 * Admin two-factor policy (pure, no I/O). This installation uses a CUSTOM TOTP system — speakeasy secrets in the
 * admin_2fa table plus a signed, user-bound "2FA verified" cookie (src/lib/admin-2fa-cookie.ts). It does not use
 * Supabase-native MFA or assurance levels (nothing in the code calls auth.mfa or reads an `aal` claim), so that
 * cookie is the single verified mechanism every admin page and API enforces.
 *
 * ENROLLMENT IS MANDATORY BY DEFAULT. Previously /api/admin/2fa/status stamped the verified cookie for any admin
 * with no 2FA record, so an admin who never enrolled — or whose enrollment was switched off — went straight
 * through. Now such an admin is NOT stamped: they must enroll (scan a secret, prove one code) first, and that proof
 * is what issues the cookie.
 *
 * ADMIN_2FA_ENROLLMENT=optional restores the old behaviour. It exists only as a deliberate, logged, temporary
 * opt-out for a staged rollout; it is a security downgrade and is never the default. Any other value (including
 * unset) means "required".
 */

export type EnrollmentPolicy = 'required' | 'optional'

export function enrollmentPolicy(env: Record<string, string | undefined> = process.env): EnrollmentPolicy {
  return env.ADMIN_2FA_ENROLLMENT === 'optional' ? 'optional' : 'required'
}

export type StatusDecision =
  /** The admin has 2FA enabled: ask for a code. Nothing is stamped. */
  | { kind: 'challenge' }
  /** No usable 2FA and enrollment is required: send them to enroll. Nothing is stamped. */
  | { kind: 'enroll' }
  /** No 2FA and the opt-out policy is on: the legacy auto-stamp. */
  | { kind: 'stamp' }
  /** The record could not be read. Fail CLOSED: no cookie, no access. */
  | { kind: 'error' }

export function decideTwoFactorStatus(input: { readFailed: boolean; enabled: boolean; policy: EnrollmentPolicy }): StatusDecision {
  if (input.readFailed) return { kind: 'error' }
  if (input.enabled) return { kind: 'challenge' }
  return input.policy === 'required' ? { kind: 'enroll' } : { kind: 'stamp' }
}

export const TWO_FACTOR_MESSAGES = {
  verifyFirst: 'Verify with your authenticator code before changing two-factor settings.',
  mandatory: 'Two-factor authentication is required for administrators and cannot be turned off here. If you have lost your authenticator, ask an owner to reset it.',
  tooManyAttempts: 'Too many attempts. Please wait a few minutes and try again.',
} as const
