'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  business_name: string
}

interface Deliverable {
  id: string
  title: string
  description: string
  file_url: string
  version: string
  uploaded_at: string
  project_id: string
  project_name: string
}

export default function ClientDeliverablesPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientData()
  }, [])

  async function fetchClientData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientData) {
        setClient(clientData)

        const { data: deliverableData } = await supabase
          .from('project_deliverables')
          .select(`
            *,
            projects (project_name)
          `)
          .order('uploaded_at', { ascending: false })

        setDeliverables(deliverableData || [])
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <p className="text-[var(--text-muted)]">No client profile found</p>
      </div>
    )
  }

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Deliverables</h1>

        {deliverables.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
            <SvgIcon name="download" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No deliverables yet.</p>
            <p className="text-sm text-[var(--text-muted)]">Deliverables will appear here once shared by your project team.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {deliverables.map((deliverable) => (
              <div
                key={deliverable.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5 transition hover:border-[var(--accent-orange)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {deliverable.project_name || 'Project'} • v{deliverable.version || '1.0'}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{deliverable.title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{deliverable.description}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Delivered {new Date(deliverable.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={deliverable.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[var(--accent-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}