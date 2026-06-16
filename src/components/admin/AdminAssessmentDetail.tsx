'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AssessmentWithMerchant } from '@/lib/services/assessment-service'
import SvgIcon from '@/components/ui/SvgIcon'
import { getClassificationColor, getStatusColor } from '@/lib/scoring/hgri-scoring'

interface AdminAssessmentDetailProps {
  assessment: AssessmentWithMerchant
  statusOptions: string[]
}

export function AdminAssessmentDetail({ assessment, statusOptions }: AdminAssessmentDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState(assessment.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/growth-assessment/${assessment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      setStatus(newStatus)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const scoreBreakdown = [
    { label: 'Visibility', value: assessment.visibility_score, max: 20 },
    { label: 'Conversion', value: assessment.conversion_score, max: 20 },
    { label: 'Retention', value: assessment.retention_score, max: 20 },
    { label: 'Authority', value: assessment.authority_score, max: 20 },
    { label: 'Scalability', value: assessment.scalability_score, max: 20 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link 
            href="/admin/growth-assessments" 
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <SvgIcon name="chevron-left" size={16} />
            Back to Assessments
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {assessment.merchant.business_name}
          </h1>
          <p className="text-[var(--text-muted)]">
            Submitted {new Date(assessment.created_at).toLocaleDateString()} • 
            HGRI Score: <span className="font-semibold text-[var(--text-primary)]">{assessment.hgri_score}/100</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Status Update */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-[var(--text-primary)]">Update Status:</label>
          <select
            value={status}
            onChange={(e) => handleStatusUpdate(e.target.value)}
            disabled={isUpdating}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          {isUpdating && (
            <span className="text-sm text-[var(--text-muted)]">Updating...</span>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Merchant Info & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Merchant Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Merchant Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm text-[var(--text-muted)]">Business Name</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.business_name}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Website</div>
                <a 
                  href={assessment.merchant.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  {assessment.merchant.website}
                </a>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Contact</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.contact_name}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Email</div>
                <a href={`mailto:${assessment.merchant.email}`} className="text-[var(--accent)] hover:underline">
                  {assessment.merchant.email}
                </a>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Country</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.country}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Industry</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.industry}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Business Stage</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.business_stage}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Store Age</div>
                <div className="text-[var(--text-primary)]">{assessment.merchant.store_age}</div>
              </div>
            </div>
          </div>

          {/* Growth Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Growth Details</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-[var(--text-muted)]">Primary Goals</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(assessment.primary_goals || []).map((goal: string) => (
                    <span key={goal} className="rounded-full bg-[var(--bg-section)] px-3 py-1 text-xs text-[var(--text-primary)]">
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Success Vision</div>
                <div className="text-[var(--text-primary)] mt-1">{assessment.success_vision}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-[var(--text-muted)]">Primary Constraint</div>
                  <div className="font-semibold text-[var(--accent)]">{assessment.primary_constraint}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-muted)]">Recommended Focus</div>
                  <div className="font-semibold text-[var(--accent-lime)]">{assessment.recommended_focus}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Biggest Challenge</div>
                <div className="text-[var(--text-primary)] mt-1">{assessment.biggest_challenge}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Main Obstacle</div>
                <div className="text-[var(--text-primary)] mt-1">{assessment.main_obstacle}</div>
              </div>
            </div>
          </div>

          {/* Marketing & Customer Experience */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Marketing & Customer Experience</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm text-[var(--text-muted)]">Marketing Channels</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(assessment.marketing_channels || []).map((channel: string) => (
                    <span key={channel} className="rounded-full bg-[var(--bg-section)] px-3 py-1 text-xs text-[var(--text-primary)]">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Best Channel</div>
                <div className="text-[var(--text-primary)]">{assessment.best_channel}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Paid Ads Usage</div>
                <div className="text-[var(--text-primary)]">{assessment.paid_ads_usage}</div>
              </div>
              {assessment.paid_ad_platforms && assessment.paid_ad_platforms.length > 0 && (
                <div>
                  <div className="text-sm text-[var(--text-muted)]">Paid Ad Platforms</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(assessment.paid_ad_platforms || []).map((platform: string) => (
                      <span key={platform} className="rounded-full bg-[var(--bg-section)] px-3 py-1 text-xs text-[var(--text-primary)]">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-[var(--text-muted)]">Visibility Confidence</div>
                <div className="text-[var(--text-primary)]">{assessment.visibility_confidence}/10</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Email Capture</div>
                <div className="text-[var(--text-primary)]">{assessment.email_capture}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Email Automations</div>
                <div className="text-[var(--text-primary)]">{assessment.email_automations}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Customer Reviews</div>
                <div className="text-[var(--text-primary)]">{assessment.customer_reviews}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Content Publishing</div>
                <div className="text-[var(--text-primary)]">{assessment.content_publishing}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Upsells/Cross-sells</div>
                <div className="text-[var(--text-primary)]">{assessment.upsells_crosssells}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Score & Classification */}
        <div className="space-y-6">
          {/* Score Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">HGRI™ Score Breakdown</h3>
            
            <div className="mb-4 text-center">
              <div className="text-5xl font-bold text-[var(--text-primary)]">{assessment.hgri_score}</div>
              <div className="text-sm text-[var(--text-muted)]">out of 100</div>
            </div>

            <div className="space-y-3">
              {scoreBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{item.label}</span>
                    <span className="font-medium text-[var(--text-primary)]">{item.value}/{item.max}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-[var(--bg-section)] overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)] transition-all duration-500"
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classification Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Classification</h3>
            <div className="text-center">
              <span className={`inline-block rounded-full px-6 py-3 text-lg font-bold text-white ${getClassificationColor(assessment.classification)}`}>
                {assessment.classification}
              </span>
              <div className="mt-2 text-sm text-[var(--text-muted)]">
                Based on {assessment.hgri_score}/100 score
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Support Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-[var(--text-muted)]">Support Type</div>
                <div className="text-[var(--text-primary)]">{assessment.support_type}</div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">Timeline</div>
                <div className="text-[var(--text-primary)]">{assessment.improvement_timeline}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}