'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { Lead, LeadStatus, LeadSource } from '@/types/admin-crm'

const statusColors: Record<LeadStatus, string> = {
  'New Lead': 'bg-blue-500/20 text-blue-400',
  'Contacted': 'bg-yellow-500/20 text-yellow-400',
  'Interested': 'bg-green-500/20 text-green-400',
  'Assessment Submitted': 'bg-purple-500/20 text-purple-400',
  'Audit Sent': 'bg-indigo-500/20 text-indigo-400',
  'Proposal Sent': 'bg-pink-500/20 text-pink-400',
  'Negotiating': 'bg-orange-500/20 text-orange-400',
  'Won': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Lost': 'bg-red-500/20 text-red-400',
  'Archived': 'bg-gray-500/20 text-gray-400',
}

const statusOptions: LeadStatus[] = [
  'New Lead', 'Contacted', 'Interested', 'Assessment Submitted',
  'Audit Sent', 'Proposal Sent', 'Negotiating', 'Won', 'Lost', 'Archived'
]

const sourceOptions: LeadSource[] = [
  'Cold Outreach', 'LinkedIn', 'Referral', 'Growth Assessment',
  'Website', 'Returning Client', 'Partner Referral', 'Other'
]

export default function AdminCRMListPage() {
  const supabase = createClientComponentClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, new: 0, won: 0, lost: 0 })

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    setLoading(true)

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLeads(data)
      const total = data.length
      const newLeads = data.filter((l: any) => l.status === 'New Lead').length
      const won = data.filter((l: any) => l.status === 'Won').length
      const lost = data.filter((l: any) => l.status === 'Lost').length
      setStats({ total, new: newLeads, won, lost })
    }

    setLoading(false)
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesStatus
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
        <h1 className="text-2xl font-bold text-white">CRM / Leads</h1>
        <Link
          href="/admin/crm/new"
          className="rounded-full bg-[var(--accent-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          + Add Lead
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Leads</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.new}</div>
          <div className="text-sm text-[var(--text-muted)]">New</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.won}</div>
          <div className="text-sm text-[var(--text-muted)]">Won</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.lost}</div>
          <div className="text-sm text-[var(--text-muted)]">Lost</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Lead</th>
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Next Follow-up</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-dark)]/50">
                    <td className="py-3 font-medium text-white">
                      {lead.lead_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {lead.business_name || 'N/A'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {lead.source || 'N/A'}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[lead.status as LeadStatus] || 'bg-gray-500/20 text-gray-400'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {lead.next_follow_up_date ? new Date(lead.next_follow_up_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/crm/${lead.id}`}
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