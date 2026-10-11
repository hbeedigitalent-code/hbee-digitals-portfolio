'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { PortalShell, type PortalClient } from './PortalShell'
import styles from './portal-shell.module.css'

/**
 * The portal's browser-side gate. This is the authentication and client lookup
 * that used to live inside layout.tsx, moved here VERBATIM IN BEHAVIOUR:
 *   - no session → /client-login;
 *   - the signed-in user's own `clients` row (RLS-scoped, as before);
 *   - no client row → the "contact support" message;
 *   - logout → supabase.auth.signOut() → /client-login.
 * Server-side protection (middleware.ts) is unchanged and runs first.
 */
export function PortalAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<PortalClient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/client-login')
        return
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)
      }
      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

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
        <p className={styles.centeredText}>No client profile found. Please contact support.</p>
      </div>
    )
  }

  return (
    <PortalShell client={client} onLogout={handleLogout}>
      {children}
    </PortalShell>
  )
}
