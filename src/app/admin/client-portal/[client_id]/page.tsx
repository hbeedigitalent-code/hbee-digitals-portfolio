// src/app/admin/client-portal/[client_id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  status: string
  created_at: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  service_selected: string
  expected_completion_date: string
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientData()
  }, [params.client_id])

  async function fetchClientData() {
    setLoading(true)

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.client_id)
      .single()

    if (clientError || !clientData) {
      router.push('/admin/client-portal')
      return
    }

    setClient(clientData)

    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })

    setProjects(projectData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Client not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/client-portal"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Clients
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
            {client.full_name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{client.business_name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Client Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Full Name</p>
              <p className="text-sm text-[var(--text-primary)]">{client.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Email</p>
              <p className="text-sm text-[var(--text-primary)]">{client.email}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">WhatsApp</p>
              <p className="text-sm text-[var(--text-primary)]">{client.whatsapp || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Business</p>
              <p className="text-sm text-[var(--text-primary)]">{client.business_name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Website</p>
              <p className="text-sm text-[var(--text-primary)]">{client.website_url || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Country</p>
              <p className="text-sm text-[var(--text-primary)]">{client.country || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Status</p>
              <p className="text-sm font-medium text-[var(--accent-lime)]">{client.status}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Joined</p>
              <p className="text-sm text-[var(--text-primary)]">{new Date(client.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projects ({projects.length})</h3>
            <Link
              href={`/admin/projects/new?client=${client.id}`}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              + Add Project
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No projects yet</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{project.project_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{project.project_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[var(--text-muted)]">{project.progress}%</span>
                      <p className="text-xs text-[var(--text-muted)]">{project.status}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}