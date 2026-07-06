// src/app/admin/agreements/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Agreement {
  id: string
  agreement_number: string
  client_id: string
  project_id: string | null
  scope: string
  deliverables: string[]
  timeline: string
  payment_terms: string
  revision_policy: string
  confidentiality_clause: string
  ownership_terms: string
  status: string
  signature_status: string
  signed_file_url: string | null
  created_at: string
  clients?: { business_name: string; full_name: string }
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-500/20 text-gray-500',
  'Sent': 'bg-blue-500/20 text-blue-500',
  'Signed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Declined': 'bg-red-500/20 text-red-500',
  'Expired': 'bg-gray-500/20 text-gray-500',
}

export default function AdminAgreementsPage() {
  const supabase = createClientComponentClient()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0 })

  useEffect(() => {
    fetchAgreements()
  }, [])

  async function fetchAgreements() {
    setLoading(true)

    const { data, error } = await supabase
      .from('agreements')
      .select(`
        *,
        clients (business_name, full_name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAgreements(data)
      const total = data.length
      const signed = data.filter((a: any) => a.status === 'Signed').length
      const pending = data.filter((a: any) => a.status === 'Sent' || a.status === 'Draft').length
      setStats({ total, signed, pending })
    }

    setLoading(false)
  }

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = 
      agreement.agreement_number?.toLowerCase().includes(search.toLowerCase()) ||
      agreement.clients?.business_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Agreements</h1>
        <Link
          href="/admin/agreements/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + New Agreement
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Agreements</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.signed}</div>
          <div className="text-sm text-[var(--text-muted)]">Signed</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          <div className="text-sm text-[var(--text-muted)]">Pending</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agreements..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusColors).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Agreement</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Signature</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgreements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No agreements found
                  </td>
                </tr>
              ) : (
                filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {agreement.agreement_number}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {agreement.clients?.business_name || 'N/A'}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[agreement.status]}`}>
                        {agreement.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        agreement.signature_status === 'Signed' ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]' :
                        agreement.signature_status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {agreement.signature_status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(agreement.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/agreements/${agreement.id}`}
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