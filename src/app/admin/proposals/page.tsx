// src/app/admin/proposals/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { Proposal, ProposalStatus } from '@/types/admin-crm'

const statusColors: Record<ProposalStatus, string> = {
  'Draft': 'bg-gray-500/20 text-gray-500',
  'Sent': 'bg-blue-500/20 text-blue-500',
  'Viewed': 'bg-yellow-500/20 text-yellow-500',
  'Approved': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Rejected': 'bg-red-500/20 text-red-500',
  'Expired': 'bg-gray-500/20 text-gray-500',
}

export default function AdminProposalsPage() {
  const supabase = createClientComponentClient()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, sent: 0, approved: 0 })

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    setLoading(true)

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProposals(data)
      const total = data.length
      const sent = data.filter((p: any) => p.status === 'Sent' || p.status === 'Viewed').length
      const approved = data.filter((p: any) => p.status === 'Approved').length
      setStats({ total, sent, approved })
    }

    setLoading(false)
  }

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = 
      proposal.project_title?.toLowerCase().includes(search.toLowerCase()) ||
      proposal.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      proposal.proposal_number?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
        <Link
          href="/admin/proposals/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + New Proposal
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Proposals</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{stats.sent}</div>
          <div className="text-sm text-[var(--text-muted)]">Sent</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.approved}</div>
          <div className="text-sm text-[var(--text-muted)]">Approved</div>
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
              placeholder="Search proposals..."
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
                <th className="pb-3 font-medium">Proposal</th>
                <th className="pb-3 font-medium">Client/Business</th>
                <th className="pb-3 font-medium">Investment</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No proposals found
                  </td>
                </tr>
              ) : (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {proposal.proposal_number}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {proposal.business_name || proposal.project_title}
                    </td>
                    <td className="py-3 text-[var(--text-primary)]">
                      ${proposal.investment?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[proposal.status as ProposalStatus]}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/proposals/${proposal.id}`}
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