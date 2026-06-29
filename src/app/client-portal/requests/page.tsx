// src/app/client-portal/requests/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'
import StatusBadge from '@/components/client-portal/StatusBadge'

interface Request {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  response: string | null
}

export default function ClientRequestsPage() {
  const supabase = createClientComponentClient()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClientId(clientData.id)
        const { data: requestData } = await supabase
          .from('project_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setRequests(requestData || [])
      }
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title || !formData.description || !clientId) return

    setSubmitting(true)

    try {
      const { error } = await supabase.from('project_requests').insert({
        client_id: clientId,
        title: formData.title,
        description: formData.description,
        status: 'open',
      })

      if (error) throw error

      setFormData({ title: '', description: '' })
      setShowForm(false)
      await fetchRequests()
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Requests</h1>
          <p className="text-[var(--text-muted)]">Submit and track your requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          <SvgIcon name="plus" size={16} color="white" />
          New Request
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Submit New Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="Brief title of your request"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="Describe your request in detail"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Submit a request and our team will get back to you."
          icon="messages"
          actionText="Submit Request"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-[var(--border)] bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{req.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{req.description}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Submitted: {new Date(req.created_at).toLocaleDateString()}
                  </p>
                  {req.response && (
                    <div className="mt-3 rounded-lg bg-[var(--bg-section)] p-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Response:</p>
                      <p className="text-sm text-[var(--text-muted)]">{req.response}</p>
                    </div>
                  )}
                </div>
                <StatusBadge status={req.status || 'open'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}