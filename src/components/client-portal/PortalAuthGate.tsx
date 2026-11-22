'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { attemptProvisionOnce } from '@/lib/client-portal/account-recovery'
import { installPortalSessionGuard, redirectToLogin } from '@/lib/client-portal/portal-session-guard'
import { PortalShell, type PortalClient } from './PortalShell'
import styles from './portal-shell.module.css'

type Problem = 'none' | 'ambiguous' | 'suspended' | 'error' | null

const PROBLEM_COPY: Record<Exclude<Problem, null>, string> = {
  suspended: 'This portal account is currently unavailable. Please contact Hbee Digitals and we will help you straight away.',
  ambiguous: 'Your sign-in is linked to more than one business record, so we have not opened your portal. Please contact Hbee Digitals.',
  error: 'We could not load your account. Please try again, or contact Hbee Digitals if it continues.',
  none: "You're signed in, but your account isn't fully set up yet. Try again, or contact Hbee Digitals and we will sort it out.",
}

/**
 * The portal's browser-side gate. Authentication behaves as before:
 *   - no session → /client-login (remembering the page, see portal-session.ts);
 *   - logout → supabase.auth.signOut() → /client-login.
 * Server-side protection (middleware.ts) is unchanged and runs first.
 *
 * Phase 18.8: the signed-in client's details now come from the session-bound
 * GET /api/client-portal/me (name, business, email, avatar — an allow-list) instead of a browser-side
 * clients.select('*'), so the whole row never reaches the browser. The shell re-reads it when the
 * Settings page announces a profile change (the 'clientProfileUpdate' event it already dispatches).
 *
 * Finalization (Batch 1):
 *   - EXPIRED SESSION: a guard on fetch sends any 401 from a portal API to the login page, so no page can sit on
 *     "could not load — try again" after the session has ended (portal-session-guard.ts).
 *   - NO CLIENT PROFILE: a signed-in user with no `clients` row gets ONE idempotent provisioning attempt
 *     (account-recovery.ts) and the client is re-read once. If it still fails, every problem state offers Try again
 *     (where it can help), Sign out and Contact Hbee Digitals — never a bare message.
 */
export function PortalAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<PortalClient | null>(null)
  const [problem, setProblem] = useState<Problem>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  // Declared first so it is installed before any child page can fetch.
  useEffect(() => installPortalSessionGuard(), [])

  const loadClient = useCallback(
    async (opts: { forceProvision?: boolean } = {}): Promise<void> => {
      try {
        let response = await fetch('/api/client-portal/me', { credentials: 'same-origin' })
        if (response.status === 401) {
          redirectToLogin()
          return
        }
        if (response.status === 404) {
          // Signed in, but no client profile. Try the existing idempotent provisioning (once per session unless the client
          // pressed Try again), then re-read exactly once. No recursion, so there is no loop.
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const outcome = await attemptProvisionOnce(user.id, { force: opts.forceProvision })
            if (outcome === 'recovered') response = await fetch('/api/client-portal/me', { credentials: 'same-origin' })
          }
          if (response.status === 404) {
            setProblem('none')
            return
          }
        }
        if (response.status === 409) {
          setProblem('ambiguous')
          return
        }
        if (response.status === 403) {
          // S6.2: a suspended account is closed here and by every portal API. Anything else on a 403 is an error.
          const body = await response.json().catch(() => null)
          setProblem(body?.state === 'suspended' ? 'suspended' : 'error')
          return
        }
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.client) {
          setProblem('error')
          return
        }
        setClient(payload.client as PortalClient)
        setProblem(null)
      } catch (err) {
        console.error('Error:', err)
        setProblem('error')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirectToLogin()
        return
      }

      await loadClient()
      setLoading(false)
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, loadClient])

  useEffect(() => {
    const refresh = () => {
      void loadClient()
    }
    window.addEventListener('clientProfileUpdate', refresh)
    return () => window.removeEventListener('clientProfileUpdate', refresh)
  }, [loadClient])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/client-login')
  }

  async function handleRetry() {
    setRetrying(true)
    await loadClient({ forceProvision: true })
    setRetrying(false)
  }

  if (loading) {
    return (
      <div className={styles.centered} role="status" aria-label="Loading your portal">
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!client) {
    const shown: Exclude<Problem, null> = problem ?? 'none'
    // Try again only where it can help: a missing profile (re-attempts provisioning) or a transient error.
    const canRetry = shown === 'none' || shown === 'error'
    return (
      <div className={styles.centered}>
        <div role="alert">
          <p className={styles.centeredText}>{PROBLEM_COPY[shown]}</p>
          <div className={styles.centeredActions}>
            {canRetry && (
              <button type="button" onClick={handleRetry} disabled={retrying} className={styles.centeredAction}>
                {retrying ? 'Trying again…' : 'Try again'}
              </button>
            )}
            <Link href="/contact" className={styles.centeredAction}>
              Contact Hbee Digitals
            </Link>
            <button type="button" onClick={handleLogout} className={styles.centeredAction}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PortalShell client={client} onLogout={handleLogout}>
      {children}
    </PortalShell>
  )
}
