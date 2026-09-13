// src/app/admin/projects/[project_id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { formatCalendarDate, toDateInputValue } from '@/lib/projects/project-date'

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
  // Supplied by GET /api/admin/projects/[project_id], which aliases the embed
  // as `client:clients(...)`. The alias is what makes the runtime shape
  // unambiguous: relying on PostgREST's default relation naming is what the
  // earlier `client` vs `clients` confusion turned on.
  client?: {
    id: string
    full_name: string | null
    business_name: string | null
    email: string | null
  } | null
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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [progressValue, setProgressValue] = useState(0)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [expectedCompletion, setExpectedCompletion] = useState('')

  useEffect(() => {
    fetchProjectData()
  }, [params.project_id])

  /**
   * Read through the admin API, not the browser.
   *
   * The previous version embedded `clients` in a session-client query. RLS
   * leaves `clients` readable only by its own owner, and PostgREST returns a
   * forbidden to-one embed as `null` instead of an error — so the request
   * succeeded, the client came back missing, and the page rendered "N/A" for
   * every project. The server route reads it under the service role behind the
   * admin + 2FA gate, and names the embed `client` explicitly.
   */
  async function fetchProjectData() {
    setLoading(true)

    const response = await fetch(`/api/admin/projects/${params.project_id}`, {
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.project) {
      router.push('/admin/projects')
      return
    }

    const data = payload.project
    setProject(data)
    setSelectedStatus(data.status)
    setProgressValue(data.progress || 0)
    // Seeded as a plain calendar date, so <input type="date"> shows the day
    // that is stored rather than a UTC-shifted neighbour.
    setExpectedCompletion(toDateInputValue(data.expected_completion_date))
    setLoading(false)
  }

  /**
   * Goes through the admin API, which applies session + 2FA + active-admin
   * before writing. The previous version updated `projects` straight from the
   * browser and discarded the result — `if (!error)` with no else — so an RLS
   * refusal or a CHECK violation looked exactly like success and the badge
   * silently kept its old value.
   */
  async function updateProject() {
    if (!project) return

    setUpdating(true)
    setUpdateError(null)
    setUpdateNotice(null)

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          status: selectedStatus,
          progress: progressValue,
          // Sent as a calendar date. An empty string is a deliberate "clear
          // the timeline", which the route distinguishes from omitting it.
          expected_completion_date: expectedCompletion,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'The project could not be updated.')
      }

      // Render what the DATABASE returned, not what was typed into the form.
      setProject({
        ...project,
        status: result.project.status,
        progress: result.project.progress,
      })
      setSelectedStatus(result.project.status)
      setProgressValue(result.project.progress ?? 0)
      setExpectedCompletion(toDateInputValue(result.project.expected_completion_date))
      setUpdateNotice('Project updated.')
    } catch (error) {
      console.error('Project update error:', error)
      setUpdateError(
        error instanceof Error ? error.message : 'The project could not be updated.',
      )
    } finally {
      setUpdating(false)
    }
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

              <div>


                <label htmlFor="project-expected-completion" className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Expected completion date</label>


                <input


                  id="project-expected-completion"


                  type="date"


                  value={expectedCompletion}


                  onChange={(e) => setExpectedCompletion(e.target.value)}


                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"


                />


                <p className="mt-1 text-xs text-[var(--text-muted)]">Leave blank while the timeline is unconfirmed.</p>


              </div>


              <button
                onClick={updateProject}
                disabled={updating}
                className="w-full rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Project'}
              </button>

              {updateError && (
                <p role="alert" className="text-sm font-semibold text-[var(--error)]">
                  {updateError}
                </p>
              )}

              {updateNotice && (
                <p role="status" className="text-sm font-semibold text-[var(--success)]">
                  {updateNotice}
                </p>
              )}
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
                <p className="text-sm text-[var(--text-primary)]">{formatCalendarDate(project.start_date, 'N/A')}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Expected Completion</p>
                <p className="text-sm text-[var(--text-primary)]">{formatCalendarDate(project.expected_completion_date, 'To be confirmed')}</p>
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