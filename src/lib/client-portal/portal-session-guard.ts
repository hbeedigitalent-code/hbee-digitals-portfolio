// src/lib/client-portal/portal-session-guard.ts
//
// BROWSER-SIDE. One place that notices an expired session on any Client Portal API call and sends the client back to sign in.
//
// Every portal page loads its data with fetch('/api/client-portal/...'). When the session has expired in an open tab those
// calls answer 401, and each page used to show its own "could not load — Try again" message forever. PortalAuthGate installs
// this guard once; any 401 from a portal API then moves the browser to the login page, remembering (a validated pathname
// only) which portal page the client was on. Other responses are untouched, and the original fetch is restored on cleanup.

import { loginUrlFor, PORTAL_LOGIN_PATH } from './portal-session'

const PORTAL_API_PREFIX = '/api/client-portal/'

function requestPath(input: RequestInfo | URL, origin: string): string | null {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const url = new URL(raw, origin)
    return url.origin === origin ? url.pathname : null
  } catch {
    return null
  }
}

export function isPortalApiRequest(input: RequestInfo | URL, origin: string): boolean {
  return requestPath(input, origin)?.startsWith(PORTAL_API_PREFIX) === true
}

let redirecting = false

/** Send the browser to the login page once, remembering the current portal page. Never redirects from the login page itself. */
export function redirectToLogin(win: Window = window): void {
  if (redirecting) return
  const here = win.location.pathname
  if (here === PORTAL_LOGIN_PATH || here.startsWith(PORTAL_LOGIN_PATH + '/')) return
  redirecting = true
  win.location.assign(loginUrlFor(here))
}

/** Installs the 401 guard on `win.fetch`; returns the cleanup that restores it. */
export function installPortalSessionGuard(win: Window = window): () => void {
  const original = win.fetch
  const guarded: typeof fetch = async (input, init) => {
    const response = await original.call(win, input, init)
    if (response.status === 401 && isPortalApiRequest(input, win.location.origin)) redirectToLogin(win)
    return response
  }
  win.fetch = guarded
  return () => {
    if (win.fetch === guarded) win.fetch = original
  }
}
