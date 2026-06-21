'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  business_name: string
}

interface RequestItem {
  id: string
  project_id: string
  title: string
  description: string
  status: string
  due_date: string
  response: string | null
  created_at: string
  completed_at: string | null
  projects: { project_name: string }
}

const statusColors: Record<string, string> = {
  'open': 'bg-yellow-500/20 text-yellow-400',
  'client_responded': 'bg-blue-500/20 text-blue-400',
  'completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'closed': 'bg-gray-500/20 text-gray-400',
}

const statusLabels: Record<string, string> = {
  'open': 'Open',
  'client_responded': 'Responded',
  'completed': 'Completed',
  'closed': 'Closed',
}

export default function ClientRequestsPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<{ [key: string]: boolean }>({})
  const [responseText, setResponseText] = useState<{ [key: string]: string }>({})

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

        const { data: requestData } = await supabase
          .from('project_requests')
          .select(`
            *,
            projects (project_name)
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })

        setRequests(requestData || [])
      }
    }

    setLoading(false)
  }

  async function handleRespond(requestId: string) {
    const response = responseText[requestId]
    if (!response || !response.trim()) return

    setResponding(prev => ({ ...prev, [requestId]: true }))

    try {
      const { error } = await supabase
        .from('project_requests')
        .update({
          response: response.trim(),
          status: 'client_responded'
        })
        .eq('id', requestId)

      if (!error) {
        setResponseText(prev => ({ ...prev, [requestId]: '' }))
        await fetchClientData()
      }
    } catch (error) {
      console.error('Response error:', error)
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }))
    }
  }

  const openRequests = requests.filter(r => r.status === 'open' || r.status === 'client_responded')
  const completedRequests = requests.filter(r => r.status === 'completed' || r.status === 'closed')

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
        <h1 className="text-3xl font-bold text-white">Requests</h1>

        {/* Open Requests */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Open Requests ({openRequests.length})</h2>
          {openRequests.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-8 text-center">
              <p className="text-[var(--text-muted)]">No open requests</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {openRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[request.status]}`}>
                          {statusLabels[request.status]}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {request.projects?.project_name || 'Project'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-white">{request.title}</h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{request.description}</p>
                      {request.due_date && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Due: {new Date(request.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Response Input */}
                  {request.status === 'open' && (
                    <div className="mt-4 flex gap-3">
                      <textarea
                        value={responseText[request.id] || ''}
                        onChange={(e) => setResponseText(prev => ({ ...prev, [request.id]: e.target.value }))}
                        placeholder="Type your response..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                        rows={2}
                      />
                      <button
                        onClick={() => handleRespond(request.id)}
                        disabled={responding[request.id] || !responseText[request.id]?.trim()}
                        className="rounded-full bg-[var(--accent-orange)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
                      >
                        {responding[request.id] ? 'Sending...' : 'Respond'}
                      </button>
                    </div>
                  )}

                  {/* Existing Response */}
                  {request.response && (
                    <div className="mt-3 rounded-lg bg-[var(--bg-navy-mid)] p-3">
                      <p className="text-xs text-[var(--text-muted)]">Your Response:</p>
                      <p className="text-sm text-white">{request.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Requests */}
        {completedRequests.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">Completed ({completedRequests.length})</h2>
            <div className="grid gap-3">
              {completedRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[request.status]}`}>
                          {statusLabels[request.status]}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {request.projects?.project_name || 'Project'}
                        </span>
                      </div>
                      <h3 className="mt-1 font-medium text-white">{request.title}</h3>
                    </div>
                    {request.completed_at && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Completed {new Date(request.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}