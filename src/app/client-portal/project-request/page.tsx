// src/app/client-portal/project-request/page.tsx
//
// New project request (Phase 18.7: presentation and copy only). The client lookup, the redirects
// and the form's submission behaviour are unchanged. The old "Full onboarding" link pointed at the
// public new-client onboarding form, which is not an option for an existing portal client, so it
// is replaced by a plain route to contact Hbee.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ProjectRequestForm } from '@/components/client-portal/ProjectRequestForm'
import { SupportLoading } from '@/components/client-portal/SupportState'
import Link from 'next/link'
import styles from '@/components/client-portal/support.module.css'

export default function ProjectRequestPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [clientData, setClientData] = useState<{
    id: string
    user_id: string
    full_name: string
    business_name: string
    email: string
  } | null>(null)

  useEffect(() => {
    async function fetchClient() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/client-login')
        return
      }

      const { data: client } = await supabase
        .from('clients')
        .select('id, user_id, full_name, business_name, email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (client) {
        setClientData(client)
      } else {
        router.push('/client-portal/settings')
        return
      }

      setLoading(false)
    }

    fetchClient()
  }, [router, supabase])

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
          clientId={clientData.id}
          userId={clientData.user_id}
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
