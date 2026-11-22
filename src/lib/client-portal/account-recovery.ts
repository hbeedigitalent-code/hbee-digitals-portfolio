// src/lib/client-portal/account-recovery.ts
//
// BROWSER-SIDE. Recovery for a signed-in user who has no client profile.
//
// The `clients` row is created by provisioning when the email is confirmed. If that step failed, or the row is missing for
// any other reason, the user is signed in but has no profile, and nothing else would ever create it. This asks the EXISTING
// idempotent endpoint (POST /api/account/provision) to do it for the caller's own account. The endpoint reads no body, takes
// no id, creates no merchant link and no approval, and is safe to repeat.
//
// NO LOOPS. The automatic attempt is made at most ONCE per user per browser session: the marker is written BEFORE the request,
// so a crash, a reload or a redirect back into the same page cannot retry it. A retry is only ever the client pressing the
// "Try again" button, which passes { force: true }.

export type RecoveryOutcome = 'recovered' | 'failed' | 'skipped'

export interface RecoveryDeps {
  fetchFn?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
}

const markerKey = (userId: string) => `hbd:provision-attempted:${userId}`

function defaultStorage(): RecoveryDeps['storage'] {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null // storage blocked (private mode / policy)
  }
}

export async function attemptProvisionOnce(userId: string, opts: { force?: boolean } = {}, deps: RecoveryDeps = {}): Promise<RecoveryOutcome> {
  if (!userId) return 'skipped'
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage
  const fetchFn = deps.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  if (!fetchFn) return 'skipped'

  if (!opts.force) {
    // Storage that cannot be read and written cannot enforce "once": do not attempt automatically rather than risk a loop.
    if (!storage) return 'skipped'
    try {
      if (storage.getItem(markerKey(userId)) != null) return 'skipped'
      storage.setItem(markerKey(userId), String(Date.now()))
    } catch {
      return 'skipped'
    }
  }

  try {
    const response = await fetchFn('/api/account/provision', { method: 'POST', credentials: 'same-origin' })
    return response.ok ? 'recovered' : 'failed'
  } catch {
    return 'failed'
  }
}
