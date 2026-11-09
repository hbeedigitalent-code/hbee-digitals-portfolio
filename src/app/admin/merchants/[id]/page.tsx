// src/app/admin/merchants/[id]/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { displayGrowthClassification } from '@/lib/growth-classification'
import { reviewStatusLabel } from '@/lib/admin/growth-review-queue'
import {
  AdminButton,
  AdminCallout,
  AdminErrorState,
  AdminFacts,
  AdminLoadingState,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  adminBtn,
  type AdminTone,
} from '@/components/admin/ui/AdminUi'

interface PageProps {
  params: {
    id: string
  }
}

const REVIEW_TONE: Record<string, AdminTone> = { pending: 'amber', in_progress: 'blue', completed: 'green' }

const day = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The merchant record (Phase A2): the hub the Growth Review workflow hangs off. It is the `merchants` table (the
 * assessment-side record), which growth_assessments, growth_reviews, growth_profiles and clients.merchant_id all
 * point at. Every link here follows a stored identifier; nothing is matched by name or email.
 * (The Merchants LIST page reads a different table, merchant_accounts, so its rows do not link here.)
 */
export default function AdminMerchantDetailPage({ params }: PageProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [clients, setClients] = useState<any[] | null>(null)
  const [reviews, setReviews] = useState<any[] | null>(null)
  const [status, setStatus] = useState<any>(null)

  const fetchMerchantData = useCallback(async () => {
    setLoading(true)
    try {
      // One call replaces four direct queries. The endpoint verifies session, user-bound admin 2FA and active
      // admin membership, then scopes every related read by the merchant id from the route.
      const response = await fetch(`/api/admin/merchants/${params.id}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (response.status === 404) {
        setLoadError(null)
        setMerchant(null)
        return
      }
      if (!response.ok || !payload?.merchant) {
        setLoadError(payload?.error || 'Could not load this merchant. Please refresh and try again.')
        return
      }

      setLoadError(null)
      setMerchant(payload.merchant)
      setStatus(payload.status)
      setAssessments(payload.assessments || [])
      setProfiles(payload.profiles || [])
      setClients(Array.isArray(payload.clients) ? payload.clients : null)
      setReviews(Array.isArray(payload.reviews) ? payload.reviews : null)
    } catch {
      setLoadError('Could not load this merchant. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { void fetchMerchantData() }, [fetchMerchantData])

  if (loading) return <AdminLoadingState label="Loading the merchant record…" />
  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminErrorState title="Could not load this merchant" message={loadError} onRetry={fetchMerchantData} />
        <div className="text-center"><AdminButton variant="secondary" href="/admin/growth-reviews">Back to Growth Reviews</AdminButton></div>
      </div>
    )
  }
  if (!merchant) {
    return (
      <AdminPageHeader eyebrow="Clients & Delivery" title="Merchant not found" description="The merchant you are looking for does not exist.">
        <AdminButton variant="primary" href="/admin/growth-reviews">Back to Growth Reviews</AdminButton>
      </AdminPageHeader>
    )
  }

  const name = merchant.business_name || 'Unnamed business'

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Growth Reviews', href: '/admin/growth-reviews' }, { label: name }]}
        eyebrow="Merchant record"
        title={name}
        description={[merchant.contact_name, merchant.email].filter(Boolean).join(' · ')}
        meta={status?.status ? <AdminStatusBadge dot>{String(status.status).replace(/_/g, ' ')}</AdminStatusBadge> : undefined}
      >
        <Link href={`/admin/growth-reviews?merchant=${merchant.id}`} className={adminBtn('secondary')}>All reviews</Link>
        <Link href={`/admin/proposals/new?merchant=${merchant.id}`} className={adminBtn('secondary')}>Create proposal</Link>
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <AdminSection id="assessments" title="Assessments and reviews" description="Each assessment this business submitted, with its review.">
            {assessments.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No assessments are stored for this merchant.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {assessments.map((assessment) => {
                  const review = reviews ? reviews.find((r) => r.assessment_id === assessment.id) : null
                  const mark = assessment.review_status === 'approved' ? 'approved' : assessment.review_status === 'rejected' ? 'rejected' : null
                  return (
                    <li key={assessment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          Submitted {day(assessment.created_at) || 'on an unknown date'}
                          {assessment.hgri_score ? ` · HGRI ${assessment.hgri_score}` : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {assessment.growth_classification && <AdminStatusBadge>{displayGrowthClassification(assessment.growth_classification)}</AdminStatusBadge>}
                          {review && <AdminStatusBadge tone={REVIEW_TONE[review.status] || 'neutral'} dot>Review {reviewStatusLabel(review.status).toLowerCase()}</AdminStatusBadge>}
                          {mark === 'approved' && <AdminStatusBadge tone="blue">Marked approved</AdminStatusBadge>}
                          {mark === 'rejected' && <AdminStatusBadge tone="red">Marked not approved</AdminStatusBadge>}
                        </div>
                      </div>
                      {review ? (
                        <Link href={`/admin/growth-reviews/${review.id}`} className={adminBtn('secondary', 'sm')}>Open review</Link>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">{reviews === null ? 'Review link unavailable' : 'No review record'}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </AdminSection>

          <AdminSection id="profiles" title="Growth Profiles" description="Profiles prepared when a review is completed.">
            {profiles.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No Growth Profile has been prepared for this merchant yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {profiles.map((profile) => (
                  <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{profile.title || 'Growth Profile'}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {[profile.growth_classification && displayGrowthClassification(profile.growth_classification), profile.hgri_score ? `${profile.hgri_score} points` : null, day(profile.created_at)].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-1.5"><AdminStatusBadge tone={profile.is_active ? 'green' : 'neutral'} dot>{profile.is_active ? 'Active' : 'Archived'}</AdminStatusBadge></div>
                    </div>
                    <Link href={`/admin/growth-profiles/${profile.id}`} className={adminBtn('secondary', 'sm')}>Open profile</Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        </div>

        <div className="min-w-0 space-y-6">
          <AdminSection id="portal-account" title="Portal account" description="The client account linked to this merchant, if any.">
            {clients === null ? (
              <AdminCallout tone="warn" title="Could not be determined">The linked portal accounts could not be read. Refresh to try again.</AdminCallout>
            ) : clients.length === 0 ? (
              <AdminCallout tone="attention" title="No portal account linked">
                Nothing is linked to this merchant yet. An invitation or an audited link is made from the review&rsquo;s Decision section; nothing is matched by email.
              </AdminCallout>
            ) : (
              <div className="space-y-3">
                {clients.length > 1 && <AdminCallout tone="warn" title="More than one portal account is linked">Resolve this before approving a programme decision; nothing is merged automatically.</AdminCallout>}
                <ul className="space-y-2">
                  {clients.map((client) => (
                    <li key={client.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{client.full_name || client.business_name || 'Client'}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{client.email}</p>
                      </div>
                      <Link href={`/admin/client-portal/${client.id}`} className={adminBtn('secondary', 'sm')}>Open client</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AdminSection>

          <AdminSection id="business" title="Business details">
            <AdminFacts
              columns={1}
              items={[
                { label: 'Business', value: merchant.business_name },
                { label: 'Contact', value: merchant.contact_name },
                { label: 'Email', value: merchant.email, href: merchant.email ? `mailto:${merchant.email}` : undefined },
                { label: 'Phone', value: merchant.phone },
                { label: 'Website', value: merchant.website, href: merchant.website || undefined, external: true },
                { label: 'Industry', value: merchant.industry },
                { label: 'Country', value: merchant.country },
                { label: 'Business stage', value: merchant.business_stage },
                { label: 'Store age', value: merchant.store_age },
                { label: 'First seen', value: day(merchant.created_at) },
              ]}
            />
          </AdminSection>
        </div>
      </div>
    </div>
  )
}
