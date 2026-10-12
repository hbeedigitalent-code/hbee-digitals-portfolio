'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { PortalShell, type PortalClient } from './PortalShell'
import styles from './portal-shell.module.css'

type Problem = 'none' | 'ambiguous' | 'error' | null

/**
 * The portal's browser-side gate. Authentication behaves as before:
 *   - no session → /client-login;
 *   - no client record → the "contact support" message;
 *   - logout → supabase.auth.signOut() → /client-login.
 * Server-side protection (middleware.ts) is unchanged and runs first.
 *
 * Phase 18.8: the signed-in client's details now come from the session-bound
 * GET /api/client-portal/me (name, business, email, avatar — an allow-list) instead of a browser-side
 * clients.select('*'), so the whole row never reaches the browser. The shell re-reads it when the
 * Settings page announces a profile change (the 'clientProfileUpdate' event it already dispatches).
 */
export function PortalAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<PortalClient | null>(null)
  const [problem, setProblem] = useState<Problem>(null)
  const [loading, setLoading] = useState(true)

  const loadClient = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/client-portal/me', { credentials: 'same-origin' })
      if (response.status === 401) {
        router.push('/client-login')
        return
      }
      if (response.status === 404) {
        setProblem('none')
        return
      }
      if (response.status === 409) {
        setProblem('ambiguous')
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
  }, [router])

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/client-login')
        return
      }

      await loadClient()
      setLoading(false)
    }

    checkAuth()
  }, [router, supabase, loadClient])

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

  if (loading) {
    return (
      <div className={styles.centered} role="status" aria-label="Loading your portal">
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!client) {
    return (
      <div className={styles.centered}>
        <p className={styles.centeredText}>
          {problem === 'ambiguous'
            ? 'Your sign-in is linked to more than one business record, so we have not opened your portal. Please contact support.'
            : problem === 'error'
              ? 'We could not load your account. Please refresh the page, or contact support if it continues.'
              : 'No client profile found. Please contact support.'}
        </p>
      </div>
    )
  }

  return (
    <PortalShell client={client} onLogout={handleLogout}>
      {children}
    </PortalShell>
  )
}
