'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'

interface Client {
  id: string
  full_name: string
  business_name: string
  email: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  expected_completion_date: string
}

export default function ClientPortalPage() {
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
      // Get client record
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientData) {
        setClient(clientData)

        // Get projects
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
        <div className="text-center">
          <SvgIcon name="warning" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">No client profile found</p>
        </div>
      </div>
    )
  }

  const activeProjects = projects.filter(p => p.status !== 'Completed' && p.status !== 'Archived')
  const totalProjects = projects.length

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {client.full_name.split(' ')[0]}!</h1>
          <p className="text-[var(--text-muted)]">Here's an overview of your projects</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-white">{totalProjects}</p>
            <p className="text-sm text-[var(--text-muted)]">Total Projects</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-[var(--accent-orange)]">{activeProjects.length}</p>
            <p className="text-sm text-[var(--text-muted)]">Active Projects</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-[var(--accent-lime)]">
              {projects.filter(p => p.status === 'Completed').length}
            </p>
            <p className="text-sm text-[var(--text-muted)]">Completed</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / (projects.length || 1))}%
            </p>
            <p className="text-sm text-[var(--text-muted)]">Average Progress</p>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-white">Your Projects</h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-8 text-center">
              <p className="text-[var(--text-muted)]">No projects yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/client-portal/projects/${project.id}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 transition hover:border-[var(--accent-orange)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{project.project_name}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      project.status === 'Completed' ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]' :
                      project.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{project.project_id}</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--bg-navy-mid)]">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{project.progress}% complete</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  )
}