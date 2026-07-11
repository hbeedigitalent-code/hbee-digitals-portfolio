// src/app/admin/projects/[project_id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Project {
  id: string
  project_id: string
  project_name: string
  client_id: string
  status: string
  progress: number
  service_selected: string
  start_date: string
  expected_completion_date: string
  description: string
  created_at: string
  client?: { full_name: string; business_name: string; email: string }
}

const statusOptions = [
  'Onboarding',
  'Assets Required',
  'In Review',
  'In Progress',
  'Awaiting Client Feedback',
  'Revision Stage',
  'Completed',
  'Archived'
]

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

export default function AdminProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [progressValue, setProgressValue] = useState(0)

  useEffect(() => {
    fetchProjectData()
  }, [params.project_id])

  async function fetchProjectData() {
    setLoading(true)

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (full_name, business_name, email)
      `)
      .eq('id', params.project_id)
      .single()

    if (error || !data) {
      router.push('/admin/projects')
      return
    }

    setProject(data)
    setSelectedStatus(data.status)
    setProgressValue(data.progress || 0)
    setLoading(false)
  }

  async function updateProject() {
    if (!project) return

    setUpdating(true)

    const { error } = await supabase
      .from('projects')
      .update({
        status: selectedStatus,
        progress: progressValue,
      })
      .eq('id', project.id)

    if (!error) {
      setProject({ ...project, status: selectedStatus, progress: progressValue })
    }

    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Project not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Projects
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
            {project.project_name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Management</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Progress: {progressValue}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              <button
                onClick={updateProject}
                disabled={updating}
                className="w-full rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Client</p>
                <p className="text-sm text-[var(--text-primary)]">{project.client?.full_name || 'N/A'}</p>
                <p className="text-xs text-[var(--text-muted)]">{project.client?.email || ''}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Business</p>
                <p className="text-sm text-[var(--text-primary)]">{project.client?.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Service</p>
                <p className="text-sm text-[var(--text-primary)]">{project.service_selected || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Start Date</p>
                <p className="text-sm text-[var(--text-primary)]">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Expected Completion</p>
                <p className="text-sm text-[var(--text-primary)]">{project.expected_completion_date ? new Date(project.expected_completion_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Created</p>
                <p className="text-sm text-[var(--text-primary)]">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Description</p>
                <p className="text-sm text-[var(--text-primary)]">{project.description || 'No description'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}