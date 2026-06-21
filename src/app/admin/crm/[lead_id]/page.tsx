'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Lead {
  id: string
  lead_name: string
  business_name: string
  email: string
  whatsapp: string
  website: string
  source: string
  industry: string
  country: string
  status: string
  last_contact_date: string
  next_follow_up_date: string
  notes: string
  created_at: string
}

const statusOptions = [
  'New Lead',
  'Contacted',
  'Interested',
  'Assessment Submitted',
  'Audit Sent',
  'Proposal Sent',
  'Negotiating',
  'Won',
  'Lost',
  'Archived'
]

const statusColors: Record<string, string> = {
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

const sourceOptions = [
  'Cold Outreach',
  'LinkedIn',
  'Referral',
  'Growth Assessment',
  'Website',
  'Returning Client',
  'Partner Referral',
  'Other'
]

export default function AdminCRMLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')

  useEffect(() => {
    fetchLead()
  }, [params.lead_id])

  async function fetchLead() {
    setLoading(true)

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.lead_id)
      .single()

    if (error || !data) {
      router.push('/admin/crm')
      return
    }

    setLead(data)
    setSelectedStatus(data.status)
    setNotes(data.notes || '')
    setNextFollowUp(data.next_follow_up_date || '')
    setLoading(false)
  }

  async function updateLead() {
    if (!lead) return

    setUpdating(true)

    const { error } = await supabase
      .from('leads')
      .update({
        status: selectedStatus,
        notes: notes,
        next_follow_up_date: nextFollowUp || null,
        last_contact_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', lead.id)

    if (!error) {
      setLead({ ...lead, status: selectedStatus, notes, next_follow_up_date: nextFollowUp })
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

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Lead not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/crm"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition"
          >
            <SvgIcon name="chevron-left" size={16} color="currentColor" />
            Back to CRM
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {lead.lead_name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{lead.business_name || 'No business name'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[lead.status]}`}>
          {lead.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Lead Management</h3>
            
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

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                />
              </div>

              <button
                onClick={updateLead}
                disabled={updating}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Lead'}
              </button>
            </div>
          </div>
        </div>

        {/* Lead Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Lead Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Lead Name</p>
                <p className="text-sm text-white">{lead.lead_name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Business</p>
                <p className="text-sm text-white">{lead.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Email</p>
                <p className="text-sm text-white">{lead.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">WhatsApp</p>
                <p className="text-sm text-white">{lead.whatsapp || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Website</p>
                <p className="text-sm text-white">{lead.website || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Source</p>
                <p className="text-sm text-white">{lead.source || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Industry</p>
                <p className="text-sm text-white">{lead.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Country</p>
                <p className="text-sm text-white">{lead.country || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Last Contact</p>
                <p className="text-sm text-white">{lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'Never'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Created</p>
                <p className="text-sm text-white">{new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
              placeholder="Add notes about this lead..."
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={updateLead}
                className="rounded-full bg-[var(--accent-orange)] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}