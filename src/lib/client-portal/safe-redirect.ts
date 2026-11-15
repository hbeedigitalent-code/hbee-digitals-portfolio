// src/lib/client-portal/safe-redirect.ts
//
// Pure. Constrains a caller-supplied post-confirmation destination to a small set of LOCAL portal pages.
//
// /api/auth/confirm used to take `redirect_to` from the query string and splice it straight after the site
// origin. `//evil.example`, `/\evil.example`, and `@evil.example`-style values turn that into an open redirect on
// an emailed link, which is exactly the link a phishing campaign wants to borrow.
//
// Rules, all of which must hold:
//   * a string that starts with exactly one "/" (never "//", never "/\\");
//   * no control characters, whitespace, or backslashes anywhere;
//   * after WHATWG URL parsing against a dummy origin, the origin must be unchanged (so no scheme or host got in);
//   * the NORMALISED pathname (dot-segments resolved, so /client-portal/../admin becomes /admin) must equal, or sit
//     beneath, one of the allowed portal pages.
//
// Only the pathname is returned. Query string and fragment are dropped: the caller appends its own
// `?confirmed=true`, and nothing the link carried should survive.

export const SAFE_REDIRECT_FALLBACK = '/client-confirmation'

const ALLOWED_PREFIXES = [
  '/client-confirmation',
  '/client-portal',
  '/client-login',
  '/client-reset-password',
  '/portal-invitation',
] as const

const DUMMY_ORIGIN = 'http://redirect-check.invalid'

export function safePortalRedirect(value: unknown, fallback: string = SAFE_REDIRECT_FALLBACK): string {
  if (typeof value !== 'string') return fallback
  if (value.length === 0 || value.length > 512) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001F\u007F]/.test(value)) return fallback

  let parsed: URL
  try {
    parsed = new URL(value, DUMMY_ORIGIN)
  } catch {
    return fallback
  }
  if (parsed.origin !== DUMMY_ORIGIN) return fallback

  const path = parsed.pathname
  const allowed = ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))
  return allowed ? path : fallback
}
