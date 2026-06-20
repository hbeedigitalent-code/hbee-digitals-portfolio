'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface OnboardingSubmission {
  id: string
  project_id: string
  full_name: string
  business_name: string
  email: string
  services_required: string[]
  budget_range: string
  status: string
  created_at: string
}

export default function AdminOnboardingPage() {
  const supabase = createClientComponentClient()
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, new: 0, reviewing: 0, ready: 0 })

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('client_onboarding_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSubmissions(data)
      
      const total = data.length
      const newCount = data.filter((s: any) => s.status === 'New Submission').length
      const reviewing = data.filter((s: any) => s.status === 'Reviewing').length
      const ready = data.filter((s: any) => s.status === 'Ready To Start').length
      
      setStats({ total, new: newCount, reviewing, ready })
    }
    
    setLoading(false)
  }

  const statusColors: Record<string, string> = {
    'New Submission': 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]',
    'Information Required': 'bg-yellow-500/20 text-yellow-400',
    'Reviewing': 'bg-blue-500/20 text-blue-400',
    'Ready To Start': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
    'In Progress': 'bg-purple-500/20 text-purple-400',
    'Completed': 'bg-green-500/20 text-green-400',
    'Archived': 'bg-gray-500/20 text-gray-400',
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Client Onboarding</h1>
        <div className="text-sm text-[var(--text-muted)]">
          {submissions.length} total submissions
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-orange)]">{stats.new}</div>
          <div className="text-sm text-[var(--text-muted)]">New</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.reviewing}</div>
          <div className="text-sm text-[var(--text-muted)]">Reviewing</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.ready}</div>
          <div className="text-sm text-[var(--text-muted)]">Ready to Start</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Project ID</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Services</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No onboarding submissions found
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-dark)]/50">
                    <td className="py-3 font-mono text-sm font-medium text-[var(--accent-orange)]">
                      {s.project_id}
                    </td>
                    <td className="py-3 font-medium text-white">
                      {s.full_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {s.business_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {s.services_required?.[0] || 'N/A'}
                      {s.services_required?.length > 1 && ` +${s.services_required.length - 1}`}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[s.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {s.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/client-onboarding/${s.id}`}
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