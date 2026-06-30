// src/app/client-portal/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import StatusBadge from '@/components/client-portal/StatusBadge'
import EmptyState from '@/components/client-portal/EmptyState'

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  description: string
}

export default function ClientProjectsPage() {
  const supabase = createClientComponentClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Projects</h1>
        <p className="text-[var(--text-muted)]">Track the progress of your projects</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="You don't have any active projects. When you start a project, it will appear here."
          icon="projects"
          actionText="Contact Us"
          onAction={() => (window.location.href = '/contact')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/client-portal/projects/${project.id}`}
              className="rounded-xl border border-[var(--border)] bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{project.project_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
                </div>
                <StatusBadge status={project.status || 'New'} />
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Progress</span>
                  <span className="font-medium text-[var(--text-primary)]">{project.progress || 0}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--bg-section)]">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}