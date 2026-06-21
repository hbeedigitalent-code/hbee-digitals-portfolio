'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { ProposalStatus } from '@/types/admin-crm'

interface Proposal {
  id: string
  proposal_number: string
  lead_id: string | null
  client_id: string | null
  project_id: string | null
  business_name: string
  project_title: string
  scope: string
  deliverables: string[]
  timeline: string
  investment: number
  payment_structure: string
  terms: string
  status: string
  share_link: string | null
  created_at: string
}

const statusOptions: ProposalStatus[] = ['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected', 'Expired']

const statusColors: Record<ProposalStatus, string> = {
  'Draft': 'bg-gray-500/20 text-gray-400',
  'Sent': 'bg-blue-500/20 text-blue-400',
  'Viewed': 'bg-yellow-500/20 text-yellow-400',
  'Approved': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Rejected': 'bg-red-500/20 text-red-400',
  'Expired': 'bg-gray-500/20 text-gray-400',
}

export default function AdminProposalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    fetchProposal()
  }, [params.id])

  async function fetchProposal() {
    setLoading(true)

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      router.push('/admin/proposals')
      return
    }

    setProposal(data)
    setSelectedStatus(data.status)
    setLoading(false)
  }

  async function updateProposal() {
    if (!proposal || selectedStatus === proposal.status) return

    setUpdating(true)

    const { error } = await supabase
      .from('proposals')
      .update({ status: selectedStatus })
      .eq('id', proposal.id)

    if (!error) {
      setProposal({ ...proposal, status: selectedStatus })
    }

    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Proposal not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/proposals"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition"
          >
            <SvgIcon name="chevron-left" size={16} color="currentColor" />
            Back to Proposals
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {proposal.proposal_number}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{proposal.project_title}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[proposal.status as ProposalStatus]}`}>
          {proposal.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Proposal Management</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={updateProposal}
                disabled={updating || selectedStatus === proposal.status}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>

              {proposal.share_link && (
                <a
                  href={proposal.share_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
                >
                  <SvgIcon name="external" size={14} color="currentColor" />
                  View Share Link
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Proposal Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Proposal Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Proposal Number</p>
                <p className="text-sm font-mono text-[var(--accent-orange)]">{proposal.proposal_number}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Business</p>
                <p className="text-sm text-white">{proposal.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Project Title</p>
                <p className="text-sm text-white">{proposal.project_title}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Investment</p>
                <p className="text-sm font-semibold text-white">${proposal.investment?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Timeline</p>
                <p className="text-sm text-white">{proposal.timeline || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Payment Structure</p>
                <p className="text-sm text-white">{proposal.payment_structure || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Scope</p>
                <p className="text-sm text-white">{proposal.scope || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Deliverables</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {proposal.deliverables?.map((item, idx) => (
                    <span key={idx} className="rounded-full bg-[var(--bg-navy-mid)] px-3 py-1 text-xs text-[var(--text-muted)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Terms</p>
                <p className="text-sm text-white">{proposal.terms || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}