// src/app/client-portal/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import StatsCard from '@/components/client-portal/StatsCard'
import EmptyState from '@/components/client-portal/EmptyState'
import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'

interface Client {
  id: string
  full_name: string
  business_name: string
  email: string
  created_at: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
}

interface Request {
  id: string
  title: string
  status: string
  created_at: string
}

export default function ClientPortalDashboard() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)

        // Projects
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setProjects(projectData || [])

        // Requests
        const { data: requestData } = await supabase
          .from('project_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setRequests(requestData || [])

        // Files
        const { data: fileData } = await supabase
          .from('project_files')
          .select('*')
          .eq('client_id', clientData.id)
          .order('uploaded_at', { ascending: false })
        setFiles(fileData || [])

        // Deliverables
        const { data: deliverableData } = await supabase
          .from('project_deliverables')
          .select('*')
          .order('created_at', { ascending: false })
        setDeliverables(deliverableData || [])

        // Invoices
        const { data: invoiceData } = await supabase
          .from('project_invoices')
          .select('*')
          .order('created_at', { ascending: false })
        setInvoices(invoiceData || [])
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

  const activeProjects = projects.filter((p) => p.status !== 'Completed')
  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'open')

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Welcome back, {client?.full_name?.split(' ')[0] || 'Client'}!
            </h1>
            <p className="text-[var(--text-muted)]">
              {client?.business_name || 'Your business'} — Here's an overview of your projects
            </p>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Member since {client?.created_at ? new Date(client.created_at).toLocaleDateString() : 'Recently'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Active Projects" value={activeProjects.length} icon="projects" />
        <StatsCard
          title="Pending Requests"
          value={pendingRequests.length}
          icon="messages"
          color="var(--blue-500)"
          bgColor="var(--blue-500)/10"
        />
        <StatsCard title="Uploaded Files" value={files.length} icon="file" color="var(--text-primary)" bgColor="var(--bg-section)" />
        <StatsCard
          title="Deliverables"
          value={deliverables.length}
          icon="download"
          color="var(--accent-lime)"
          bgColor="var(--accent-lime)/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/client-portal/files"
            className="rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
          >
            Upload File
          </Link>
          <Link
            href="/client-portal/requests"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            Submit Request
          </Link>
          <Link
            href="/client-portal/deliverables"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            View Deliverables
          </Link>
          <Link
            href="/client-portal/invoices"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Projects</h2>
          <Link href="/client-portal/projects" className="text-sm text-[var(--accent-orange)] hover:underline">
            View All
          </Link>
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
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/client-portal/projects/${project.id}`}
                className="rounded-xl border border-[var(--border)] bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{project.project_name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {project.status || 'New'}
                  </span>
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

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Recent Requests</h3>
            <Link href="/client-portal/requests" className="text-sm text-[var(--accent-orange)] hover:underline">
              View All
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{req.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    req.status === 'completed' ? 'bg-green-100 text-green-700' :
                    req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
            <Link href="/client-portal/invoices" className="text-sm text-[var(--accent-orange)] hover:underline">
              View All
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{inv.invoice_number}</p>
                    <p className="text-xs text-[var(--text-muted)]">${inv.amount?.toFixed(2)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {inv.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}