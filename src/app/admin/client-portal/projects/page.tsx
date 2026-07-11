// src/app/admin/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  service_selected: string
  created_at: string
  client: { full_name: string; business_name: string }
}

const statusColors: Record<string, string> = {
  'Onboarding': 'bg-yellow-500/20 text-yellow-500',
  'Assets Required': 'bg-orange-500/20 text-orange-500',
  'In Review': 'bg-blue-500/20 text-blue-500',
  'In Progress': 'bg-cyan-500/20 text-cyan-500',
  'Awaiting Client Feedback': 'bg-purple-500/20 text-purple-500',
  'Revision Stage': 'bg-pink-500/20 text-pink-500',
  'Completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Archived': 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
}

export default function AdminProjectsPage() {
  const supabase = createClientComponentClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 })

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (full_name, business_name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
      
      const total = data.length
      const active = data.filter((p: any) => p.status !== 'Completed' && p.status !== 'Archived').length
      const completed = data.filter((p: any) => p.status === 'Completed').length
      
      setStats({ total, active, completed })
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
        <div className="text-sm text-[var(--text-muted)]">
          {projects.length} total projects
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Projects</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.completed}</div>
          <div className="text-sm text-[var(--text-muted)]">Completed</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Project ID</th>
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Service</th>
                <th className="pb-3 font-medium">Progress</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No projects found
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-mono text-sm font-medium text-[var(--accent)]">
                      {project.project_id}
                    </td>
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {project.project_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {project.client?.full_name || 'N/A'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {project.service_selected || 'N/A'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[var(--bg-section)]">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                      >
                        View
                        <SvgIcon name="arrow-right" size={12} color="var(--accent)" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}