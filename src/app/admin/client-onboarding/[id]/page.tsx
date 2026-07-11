// src/app/admin/client-onboarding/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface OnboardingSubmission {
  id: string
  project_id: string
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  industry: string
  business_stage: string
  monthly_revenue: string
  heard_about_us: string
  services_required: string[]
  project_goal: string
  main_challenge: string
  priority_1: string
  priority_2: string
  priority_3: string
  target_outcome: string
  expected_deadline: string
  budget_range: string
  target_audience: string
  traffic_sources: string[]
  marketing_challenges: string
  competitors: string[]
  inspiration_websites: string[]
  brand_mission: string
  brand_values: string
  brand_voice: string
  brand_colors: string
  brand_fonts: string
  target_customer_profile: string
  existing_brand_guidelines: string
  platform: string
  needs_collaborator_access: string
  collaborator_request_code: string
  staff_access_email: string
  store_login_url: string
  access_instructions: string
  technical_notes: string
  decision_maker_name: string
  decision_maker_role: string
  decision_maker_email: string
  decision_maker_phone: string
  team_members: { name: string; role: string; email: string }[]
  large_file_links: { name: string; url: string }[]
  additional_requests: string
  special_instructions: string
  success_metrics: string
  consent: boolean
  status: string
  internal_notes: string
  created_at: string
  files?: { id: string; file_name: string; file_url: string; file_type: string; file_size: number }[]
}

const statusOptions = [
  'New Submission',
  'Information Required',
  'Reviewing',
  'Ready To Start',
  'Proposal Sent',
  'Awaiting Approval',
  'In Progress',
  'Completed',
  'Archived'
]

const statusColors: Record<string, string> = {
  'New Submission': 'bg-[var(--accent)]/20 text-[var(--accent)]',
  'Information Required': 'bg-yellow-500/20 text-yellow-500',
  'Reviewing': 'bg-blue-500/20 text-blue-500',
  'Ready To Start': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Proposal Sent': 'bg-purple-500/20 text-purple-500',
  'Awaiting Approval': 'bg-indigo-500/20 text-indigo-500',
  'In Progress': 'bg-cyan-500/20 text-cyan-500',
  'Completed': 'bg-green-500/20 text-green-500',
  'Archived': 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
}

export default function AdminOnboardingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    fetchSubmission()
  }, [params.id])

  async function fetchSubmission() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('client_onboarding_submissions')
      .select(`
        *,
        files:client_onboarding_files(*)
      `)
      .eq('id', params.id)
      .single()

    if (!error && data) {
      setSubmission(data)
      setSelectedStatus(data.status)
    } else {
      router.push('/admin/client-onboarding')
    }
    
    setLoading(false)
  }

  async function updateStatus() {
    if (!submission || !selectedStatus || selectedStatus === submission.status) return
    
    setUpdating(true)
    
    const { error } = await supabase
      .from('client_onboarding_submissions')
      .update({ status: selectedStatus })
      .eq('id', submission.id)

    if (!error) {
      setSubmission({ ...submission, status: selectedStatus })
    }
    
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
        <p className="text-[var(--text-muted)]">Submission not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/client-onboarding"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Onboarding
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
            {submission.project_id}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[submission.status] || 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'}`}>
            {submission.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Status Management</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Update Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={updateStatus}
                disabled={updating || selectedStatus === submission.status}
                className="w-full rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Client Information</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Full Name</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Email</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">WhatsApp</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.whatsapp || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Business Name</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.business_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Website</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.website_url || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Country</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.country || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Industry</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.industry}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Business Stage</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.business_stage}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Monthly Revenue</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.monthly_revenue || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Heard About Us</p>
                <p className="text-sm text-[var(--text-primary)]">{submission.heard_about_us || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Details</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Services Required</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {(submission.services_required || []).map((service) => (
                <span key={service} className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)]">
                  {service}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Budget Range</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.budget_range}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">Project Goal</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.project_goal}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">Main Challenge</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.main_challenge || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Priority 1</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.priority_1}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Priority 2</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.priority_2}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Priority 3</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.priority_3}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Expected Deadline</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.expected_deadline || 'Not provided'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">Target Outcome</p>
            <p className="text-sm text-[var(--text-primary)]">{submission.target_outcome}</p>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {(submission.files && submission.files.length > 0) && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Uploaded Files</h3>
          
          <div className="grid gap-3">
            {submission.files.map((file) => (
              <div key={file.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <div className="flex items-center gap-3">
                  <SvgIcon name="file" size={20} color="var(--text-muted)" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{file.file_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type || 'Unknown'}
                    </p>
                  </div>
                </div>
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}