// src/app/client-portal/page.tsx
//
// Client Portal Home. This page only LOADS the dashboard payload; OverviewView (components/client-portal/overview) presents it.
//
// It reads one session-bound endpoint, /api/client-portal/dashboard, which resolves the client on the server and returns an allow-listed
// payload. Nothing here queries Supabase from the browser, and nothing is invented: there is no stage tracker, milestone, "latest update" or
// messages feed because the backend has no such data.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { OverviewView } from '@/components/client-portal/overview/OverviewView'
import prim from '@/components/client-portal/portal-primitives.module.css'
import type { DashboardData } from '@/lib/client-portal/overview-model'
import styles from '@/components/client-portal/overview/overview.module.css'

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

export default function ClientPortalHome() {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<DashboardData | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch('/api/client-portal/dashboard', { credentials: 'same-origin' })
      if (res.status === 409) {
        setState('ambiguous')
        return
      }
      if (!res.ok) {
        setState('error')
        return
      }
      setData((await res.json()) as DashboardData)
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') {
    return (
      <div className={styles.center} role="status" aria-label="Loading your overview">
        <div className={styles.spinner} />
      </div>
    )
  }

  if (state === 'ambiguous') {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>Your sign-in is linked to more than one business record, so we have not shown your dashboard. Please contact us and we will sort it out.</p>
          <Link href="/contact" className={prim.secondary}>
            Contact Hbee Digitals
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'error' || !data) {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>We could not load your dashboard. Please try again in a moment.</p>
          <button type="button" onClick={load} className={prim.secondary}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return <OverviewView data={data} />
}
