'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
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
  service_selected: string
}

interface Milestone {
  id: string
  title: string
  description: string
  status: string
  due_date: string
  completed_at: string | null
}

interface Update {
  id: string
  title: string
  description: string
  created_by: string
  created_at: string
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

const milestoneStatusColors: Record<string, string> = {
  'pending': 'bg-gray-500/20 text-gray-400',
  'in_progress': 'bg-blue-500/20 text-blue-400',
  'completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'awaiting_client': 'bg-purple-500/20 text-purple-400',
}

export default function ClientProjectDetailPage() {
  const params = useParams()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectData()
  }, [params.id])

  async function fetchProjectData() {
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

        // Get project
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.id)
          .single()

        if (projectData) {
          setProject(projectData)

          // Get milestones
          const { data: milestoneData } = await supabase
            .from('project_milestones')
            .select('*')
            .eq('project_id', projectData.id)
            .order('due_date', { ascending: true })

          setMilestones(milestoneData || [])

          // Get updates
          const { data: updateData } = await supabase
            .from('project_updates')
            .select('*')
            .eq('project_id', projectData.id)
            .order('created_at', { ascending: false })
            .limit(5)

          setUpdates(updateData || [])
        }
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

  if (!client || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <p className="text-[var(--text-muted)]">Project not found</p>
      </div>
    )
  }

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{project.project_name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}>
              {project.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{project.project_id}</p>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Project Progress</span>
            <span className="text-sm font-bold text-white">{project.progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-navy-mid)]">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Service</p>
            <p className="font-medium text-white">{project.service_selected || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Start Date</p>
            <p className="font-medium text-white">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Expected Completion</p>
            <p className="font-medium text-white">
              {project.expected_completion_date ? new Date(project.expected_completion_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Description</p>
            <p className="font-medium text-white">{project.description || 'N/A'}</p>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Milestones</h2>
          {milestones.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6 text-center">
              <p className="text-[var(--text-muted)]">No milestones yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card-dark)] p-4"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${
                        milestone.status === 'completed' ? 'bg-[var(--accent-lime)]' :
                        milestone.status === 'in_progress' ? 'bg-blue-400' :
                        milestone.status === 'awaiting_client' ? 'bg-purple-400' :
                        'bg-gray-400'
                      }`} />
                      <p className="font-medium text-white">{milestone.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${milestoneStatusColors[milestone.status]}`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{milestone.description}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Updates */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Recent Updates</h2>
          {updates.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6 text-center">
              <p className="text-[var(--text-muted)]">No updates yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-dark)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{update.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(update.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{update.description}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">By {update.created_by}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  )
}