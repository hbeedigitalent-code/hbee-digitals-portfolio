// src/app/client-portal/project-request/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ProjectRequestForm } from '@/components/client-portal/ProjectRequestForm'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!clientData) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Request New Project</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Submit a quick project request. Our team will review and get back to you.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
            Quick Request
          </span>
          <span className="text-xs text-[var(--text-muted)]">3 simple steps</span>
        </div>

        <ProjectRequestForm
          clientId={clientData.id}
          userId={clientData.user_id}
          clientName={clientData.full_name}
          businessName={clientData.business_name}
          email={clientData.email}
          onCancel={() => router.push('/client-portal/projects')}
        />
      </div>

      <div className="text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Need to provide more details?{' '}
          <Link
            href="/client-onboarding"
            className="text-[var(--accent)] hover:underline"
          >
            Use full onboarding
          </Link>
        </p>
      </div>
    </div>
  )
}