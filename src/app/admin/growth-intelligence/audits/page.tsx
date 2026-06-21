'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { AuditReport, AuditType, AuditStatus } from '@/types/growth-intelligence'

const auditTypes: AuditType[] = [
  'Store Audit',
  'SEO Audit',
  'Growth Audit',
  'Conversion Audit',
  'AI Visibility Audit',
  'Authority Audit',
  'Brand Audit',
  'Custom Audit'
]

const statusColors: Record<AuditStatus, string> = {
  'Draft': 'bg-gray-500/20 text-gray-400',
  'In Review': 'bg-yellow-500/20 text-yellow-400',
  'Completed': 'bg-blue-500/20 text-blue-400',
  'Delivered': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
}

export default function AdminAuditsPage() {
  const supabase = createClientComponentClient()
  const [audits, setAudits] = useState<AuditReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAudits()
  }, [])

  async function fetchAudits() {
    setLoading(true)

    const { data, error } = await supabase
      .from('audit_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAudits(data)
    }

    setLoading(false)
  }

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = 
      audit.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      audit.audit_type?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || audit.audit_type === typeFilter
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audits</h1>
        <Link
          href="/admin/growth-intelligence/audits/new"
          className="rounded-full bg-[var(--accent-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          + New Audit
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audits..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="all">All Types</option>
            {auditTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusColors).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Audit Type</th>
                <th className="pb-3 font-medium">Reviewer</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No audits found
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => (
                  <tr key={audit.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-dark)]/50">
                    <td className="py-3 font-medium text-white">
                      {audit.business_name || 'N/A'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {audit.audit_type}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {audit.reviewer || 'N/A'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {audit.review_date ? new Date(audit.review_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[audit.status as AuditStatus]}`}>
                        {audit.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/growth-intelligence/audits/${audit.id}`}
                        className="inline-flex items-center gap-1 text-[var(--accent-orange)] hover:underline"
                      >
                        View
                        <SvgIcon name="arrow-right" size={12} color="var(--accent-orange)" />
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