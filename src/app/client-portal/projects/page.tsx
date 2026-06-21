'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  business_name: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  start_date: string
  expected_completion_date: string
  description: string
}

const statusColors: Record<string, string> = {
  'Onboarding': 'bg-yellow-500/20 text-yellow-400',
  'Assets Required': 'bg-orange-500/20 text-orange-400',
  'In Review': 'bg-blue-500/20 text-blue-400',
  'In Progress': 'bg-cyan-500/20 text-cyan-400',
  'Awaiting Client Feedback': 'bg-purple-500/20 text-purple-400',
  'Revision Stage': 'bg-pink-500/20 text-pink-400',
  'Completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Archived': 'bg-gray-500/20 text-gray-400',
}

export default function ClientProjectsPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
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

        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })

        setProjects(projectData || [])
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
            <SvgIcon name="projects" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">You don't have any projects yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/client-portal/projects/${project.id}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5 transition hover:border-[var(--accent-orange)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono text-[var(--accent-orange)]">{project.project_id}</p>
                    <h3 className="text-lg font-semibold text-white">{project.project_name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{project.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {project.status}
                    </span>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {project.progress}% complete
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--bg-navy-mid)]">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="mt-3 flex gap-4 text-xs text-[var(--text-muted)]">
                  <span>Started: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                  <span>Expected: {project.expected_completion_date ? new Date(project.expected_completion_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}