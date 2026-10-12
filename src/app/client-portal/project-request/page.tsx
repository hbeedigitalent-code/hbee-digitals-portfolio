// src/app/client-portal/project-request/page.tsx
//
// New project request. The page needs only the client's business/name for context, which it reads
// from the session-bound /api/client-portal/me (no browser-side clients query, no Supabase client
// at all). Unauthenticated -> /client-login and no client record -> /client-portal/settings, exactly
// as before. The form submits through /api/client-portal/project-requests.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectRequestForm } from '@/components/client-portal/ProjectRequestForm'
import { SupportLoading } from '@/components/client-portal/SupportState'
import Link from 'next/link'
import styles from '@/components/client-portal/support.module.css'

export default function ProjectRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clientData, setClientData] = useState<{
    full_name: string
    business_name: string
    email: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchClient() {
      try {
        const response = await fetch('/api/client-portal/me', { credentials: 'same-origin' })

        if (response.status === 401) {
          router.push('/client-login')
          return
        }
        const payload = await response.json().catch(() => null)

        if (response.ok && payload?.client) {
          if (!cancelled) {
            setClientData({
              full_name: payload.client.full_name || '',
              business_name: payload.client.business_name || '',
              email: payload.client.email || '',
            })
            setLoading(false)
          }
          return
        }

        // No client record (404), ambiguous binding (409) or a server error: send them to Settings,
        // which explains the account state, exactly as the page did when no client row was found.
        router.push('/client-portal/settings')
      } catch (err) {
        console.error('Error:', err)
        router.push('/client-portal/settings')
      }
    }

    fetchClient()
    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) return <SupportLoading />

  if (!clientData) {
    return null
  }

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          New request
        </p>
        <h1 className={styles.h1}>Request a new project</h1>
        <p className={styles.lead}>
          Tell Hbee what you&rsquo;d like to work on
          {clientData.business_name ? ` for ${clientData.business_name}` : ''}. The project will appear in your portal once you submit.
        </p>
      </header>

      <section className={styles.panel} aria-label="Project request form">
        <ProjectRequestForm
          clientName={clientData.full_name}
          businessName={clientData.business_name}
          email={clientData.email}
          onCancel={() => router.push('/client-portal/projects')}
        />
      </section>

      <p className={styles.quiet}>
        Prefer to talk it through first?{' '}
        <Link href="/contact" className={styles.link} style={{ display: 'inline-flex' }}>
          Contact Hbee
        </Link>
      </p>
    </div>
  )
}
