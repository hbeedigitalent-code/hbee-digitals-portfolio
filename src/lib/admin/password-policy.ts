/**
 * Admin password policy (client-side guard). One source for every Admin password form: the recovery page
 * (/admin/reset-password) and Profile Settings.
 *
 * This is a UI guard, not a server guarantee: the authoritative minimum is the project's Supabase Auth
 * "Minimum password length" setting, which lives in the Supabase dashboard (the repository holds no Supabase
 * config). It must be raised to 12 there too (staging first) or a direct API call could still set a shorter one.
 *
 * The Client Portal's own password forms (signup, reset) are deliberately NOT governed by this.
 */

export const ADMIN_PASSWORD_MIN_LENGTH = 12

/** Supabase/GoTrue hashes with bcrypt, which does not accept more than 72 bytes. */
export const ADMIN_PASSWORD_MAX_LENGTH = 72

/** An error message for an unacceptable password, or null when it is acceptable. Length only: no composition rules. */
export function adminPasswordError(password: string): string | null {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return `Use at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`
  if (new TextEncoder().encode(password).length > ADMIN_PASSWORD_MAX_LENGTH) return `Use no more than ${ADMIN_PASSWORD_MAX_LENGTH} characters.`
  if (password.trim().length === 0) return 'A password cannot be only spaces.'
  return null
}
