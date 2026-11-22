// src/lib/client-portal/portal-session.ts
//
// Pure. The Client Portal's login round-trip: where an unauthenticated client is sent, and where a client who has just
// signed in is allowed to land.
//
// The destination is only ever a PATHNAME under the portal (or the portal-invitation page). It is validated by the existing
// safePortalRedirect (no scheme, no host, no "//", no backslashes, dot-segments resolved), and the query string and fragment
// are dropped. A value that fails any rule falls back to the portal root, so a crafted `?next=` can never leave the site.

import { safePortalRedirect } from './safe-redirect'

export const PORTAL_LOGIN_PATH = '/client-login'
export const PORTAL_HOME_PATH = '/client-portal'
const INVITATION_PATH = '/portal-invitation'

const under = (path: string, base: string) => path === base || path.startsWith(base + '/')

/** A portal page (or the invitation page) a client may be returned to after signing in; null for anything else. */
export function safeReturnPath(value: unknown): string | null {
  const path = safePortalRedirect(value, '')
  if (!path) return null
  if (under(path, PORTAL_HOME_PATH) || under(path, INVITATION_PATH)) return path
  return null
}

/** Where a client who has just signed in goes: the validated `next` page, else the portal home. */
export function postLoginDestination(next: unknown): string {
  return safeReturnPath(next) ?? PORTAL_HOME_PATH
}

/** The login URL for an expired or missing session, remembering the page the client was on when that is a portal page. */
export function loginUrlFor(currentPath: unknown): string {
  const back = safeReturnPath(currentPath)
  // The portal root is the default destination already; there is nothing to remember.
  return back && back !== PORTAL_HOME_PATH ? `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(back)}` : PORTAL_LOGIN_PATH
}
