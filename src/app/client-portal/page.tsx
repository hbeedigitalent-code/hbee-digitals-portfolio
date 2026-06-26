'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  user_id: string
  full_name: string
  business_name: string
  email: string
  status: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
}

export default function ClientPortalPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClientData()
  }, [])

  async function fetchClientData() {
    setLoading(true)
    setError(null)

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Auth error:', userError)
        router.push('/client-login')
        return
      }

      console.log('✅ User ID:', user.id)

      // 2. Check if client exists
      let { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('Client query result:', { clientData, clientError })

      if (clientError) {
        console.error('Client fetch error:', clientError)
        setError('Database error fetching client profile.')
        return
      }

      // 3. If no client, try to create one
      if (!clientData) {
        console.log('⚠️ No client found, creating one...')
        
        const newClient = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
          email: user.email,
          business_name: user.user_metadata?.business_name || 'My Business',
          status: 'active',
        }

        console.log('Creating client with:', newClient)

        const { data: created, error: createError } = await supabase
          .from('clients')
          .insert(newClient)
          .select()
          .single()

        if (createError) {
          console.error('Create client error:', createError)
          setError(`Unable to create client profile: ${createError.message}`)
          return
        }

        if (created) {
          console.log('✅ Client created:', created)
          setClient(created)
          // Fetch projects for new client
          await fetchProjects(created.id)
          setLoading(false)
          return
        }
      }

      // 4. Client exists
      if (clientData) {
        console.log('✅ Client found:', clientData)
        setClient(clientData)
        await fetchProjects(clientData.id)
      }

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjects(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Project fetch error:', error)
      } else {
        setProjects(data || [])
      }
    } catch (err) {
      console.error('Project fetch error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center bg-[var(--bg-navy)] px-4">
        <div className="max-w-md text-center">
          <div className="rounded-full bg-red-500/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <SvgIcon name="warning" size={40} color="#ef4444" />
          </div>
          <h1 className="text-2xl font-bold text-white">Client Profile Error</h1>
          <p className="mt-2 text-[var(--text-muted)]">{error}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Please contact support for assistance.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
            >
              Retry
            </button>
            <Link
              href="/client-login"
              className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
            >
              Go to Login
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {client.full_name?.split(' ')[0] || 'Client'}!
          </h1>
          <p className="text-[var(--text-muted)]">{client.business_name}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-white">{projects.length}</p>
            <p className="text-sm text-[var(--text-muted)]">Total Projects</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-2xl font-bold text-[var(--accent-orange)]">
              {projects.filter(p => p.status !== 'Completed').length}
            </p>
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
              {projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length) : 0}%
            </p>
            <p className="text-sm text-[var(--text-muted)]">Avg Progress</p>
          </div>
        </div>

        {/* Projects */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-white">Your Projects</h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-8 text-center">
              <p className="text-[var(--text-muted)]">You don't have any projects yet.</p>
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
                      {project.status || 'New'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{project.project_id}</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--bg-navy-mid)]">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  )
}