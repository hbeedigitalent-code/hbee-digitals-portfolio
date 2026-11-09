// src/app/admin/growth-profiles/[id]/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { displayGrowthClassification } from '@/lib/growth-classification'
import { formatDateOrDash, formatDateOrNull } from '@/lib/safe-date'
import { ProfileStanding, releaseChip, type ProfileStatusData } from '@/components/admin/growth/ProfileStatus'
import {
  AdminButton,
  AdminErrorState,
  AdminFacts,
  AdminLoadingState,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  adminBtn,
} from '@/components/admin/ui/AdminUi'

interface PageProps {
  params: {
    id: string
  }
}

const PILLAR_LABELS: Record<string, string> = { visibility: 'Visibility', conversion: 'Conversion', retention: 'Retention', authority: 'Authority', scalability: 'Scalability' }

/** Only an absolute http(s) URL is ever rendered as a link; anything else is dropped. */
function safeHttp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export default function AdminGrowthProfileDetailPage({ params }: PageProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<ProfileStatusData | undefined>(undefined)
  const [releaseEnabled, setReleaseEnabled] = useState<boolean | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      // One call: /api/admin/growth-profiles/[id] returns the profile with its merchant, assessment, latest PDF and
      // (read-only) the stored review / decision / linkage / invitation facts, after verifying session, user-bound
      // admin 2FA and active admin membership.
      const response = await fetch(`/api/admin/growth-profiles/${params.id}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (response.status === 404) {
        setLoadError(null)
        setProfile(null)
        return
      }
      if (!response.ok || !payload?.profile) {
        setLoadError(payload?.error || 'Could not load this profile. Please refresh and try again.')
        return
      }

      setLoadError(null)
      setProfile(payload.profile)
      setPdfUrl(safeHttp(payload.pdf_url))
      setStatus(payload.status || undefined)
      setReleaseEnabled(typeof payload.releaseEnabled === 'boolean' ? payload.releaseEnabled : null)
    } catch {
      setLoadError('Could not load this profile. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { void fetchProfile() }, [fetchProfile])

  if (loading) return <AdminLoadingState label="Loading the profile…" />

  // A failed or denied load is distinct from "this profile does not exist".
  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminErrorState title="Could not load this profile" message={loadError} onRetry={fetchProfile} />
        <div className="text-center"><AdminButton variant="secondary" href="/admin/growth-profiles">Back to Growth Profiles</AdminButton></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <AdminPageHeader eyebrow="Growth" title="Profile not found" description="The growth profile you are looking for does not exist.">
        <AdminButton variant="primary" href="/admin/growth-profiles">Back to Growth Profiles</AdminButton>
      </AdminPageHeader>
    )
  }

  const merchant = Array.isArray(profile.merchant) ? profile.merchant[0] : profile.merchant
  const name = merchant?.business_name || 'Unnamed business'
  const classification = profile.growth_classification ? displayGrowthClassification(profile.growth_classification) : null
  const pillars: Array<[string, number]> = Object.entries(profile.profile_data?.scores?.pillars || {}).map(([key, score]: [string, any]) => [key, typeof score === 'number' ? score : Number(score?.score) || 0])
  const recommendations: string[] = Array.isArray(profile.profile_data?.recommendations) ? profile.profile_data.recommendations.filter((r: unknown) => typeof r === 'string') : []
  const updated = formatDateOrNull(profile.updated_at)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Growth Profiles', href: '/admin/growth-profiles' }, { label: name }]}
        eyebrow="Growth Profile"
        title={profile.title || `${name} — Growth Profile`}
        description={`${name} · Prepared ${formatDateOrDash(profile.created_at)}`}
        meta={
          <>
            <AdminStatusBadge tone={profile.is_active ? 'neutral' : 'amber'}>{profile.is_active ? 'Active flag' : 'Archived flag'}</AdminStatusBadge>
            {status && <AdminStatusBadge tone={releaseChip(status).tone}>{releaseChip(status).text}</AdminStatusBadge>}
          </>
        }
      >
        {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={adminBtn('secondary')}>Download PDF</a>}
        {profile.merchant_id && <Link href={`/admin/merchants/${profile.merchant_id}`} className={adminBtn('secondary')}>Merchant record</Link>}
      </AdminPageHeader>

      <AdminSection id="standing" title="Where this profile stands" description="Four different facts, each from a stored record: prepared, decided, linked and visible. Completing a review does not make a profile visible.">
        <ProfileStanding status={status} profileId={profile.id} merchantId={profile.merchant_id} releaseEnabled={releaseEnabled} />
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <AdminSection id="summary" title="Growth score" description="As prepared when the review was completed.">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex-none text-center sm:text-left">
                <div className="text-5xl font-extrabold text-[var(--text-primary)]">{profile.hgri_score || 0}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">HGRI™ score</div>
              </div>
              <div className="min-w-0 flex-1">
                {classification && <AdminStatusBadge tone="dark">{classification}</AdminStatusBadge>}
                {profile.summary && <p className="mt-2 whitespace-pre-line break-words text-[var(--text-secondary)]">{profile.summary}</p>}
              </div>
            </div>
          </AdminSection>

          {pillars.length > 0 && (
            <AdminSection id="pillars" title="Growth pillars">
              <div className="space-y-4">
                {pillars.map(([pillar, score]) => (
                  <div key={pillar}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{PILLAR_LABELS[pillar] || pillar.charAt(0).toUpperCase() + pillar.slice(1)}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{score}/100</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                      <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </AdminSection>
          )}

          {((profile.strengths?.length ?? 0) > 0 || (profile.opportunities?.length ?? 0) > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {(['strengths', 'opportunities'] as const).map((field) =>
                profile[field]?.length > 0 ? (
                  <AdminSection key={field} id={field} title={field === 'strengths' ? 'Strengths' : 'Opportunities'}>
                    <ul className="space-y-2">
                      {profile[field].map((entry: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 break-words text-sm text-[var(--text-secondary)]">
                          <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">•</span>{entry}
                        </li>
                      ))}
                    </ul>
                  </AdminSection>
                ) : null,
              )}
            </div>
          )}

          {recommendations.length > 0 && (
            <AdminSection id="recommendations" title="Growth recommendations">
              <ol className="space-y-3">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 break-words text-sm text-[var(--text-secondary)]">
                    <span className="flex-none font-semibold text-[var(--accent)]">{index + 1}.</span>{rec}
                  </li>
                ))}
              </ol>
            </AdminSection>
          )}

          {profile.profile_data && (
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">Raw profile data</summary>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--bg-section)] p-4 text-xs text-[var(--text-secondary)]">{JSON.stringify(profile.profile_data, null, 2)}</pre>
            </details>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <AdminSection id="merchant" title="Merchant">
            <AdminFacts
              columns={1}
              items={[
                { label: 'Business', value: merchant?.business_name },
                { label: 'Email', value: merchant?.email, href: merchant?.email ? `mailto:${merchant.email}` : undefined },
                { label: 'Website', value: merchant?.website, href: safeHttp(merchant?.website) || undefined, external: true },
                { label: 'Industry', value: merchant?.industry },
                { label: 'Country', value: merchant?.country },
              ]}
            />
          </AdminSection>

          <AdminSection id="details" title="Profile details">
            <AdminFacts
              columns={1}
              items={[
                { label: 'Admin flag', value: profile.is_active ? 'Active' : 'Archived' },
                { label: 'Prepared', value: formatDateOrDash(profile.created_at) },
                // growth_profiles has no update timestamp in the detail response; the row appears only when a real one is supplied.
                ...(updated ? [{ label: 'Updated', value: updated }] : []),
              ]}
            />
            <p className="mt-3 text-xs text-[var(--text-muted)]">The Active / Archived flag is an admin label. The Client Portal shows the profile named on the merchant&rsquo;s approval, so changing the flag does not release or withdraw anything.</p>
          </AdminSection>

          <AdminSection id="actions" title="Actions">
            <div className="flex flex-col gap-2">
              {profile.merchant_id && <Link href={`/admin/proposals/new?merchant=${profile.merchant_id}`} className={adminBtn('primary')}>Create proposal</Link>}
              {profile.merchant_id && <Link href={`/admin/growth-reviews?merchant=${profile.merchant_id}`} className={adminBtn('secondary')}>View reviews</Link>}
              {status?.review.id && <Link href={`/admin/growth-reviews/${status.review.id}#decision`} className={adminBtn('secondary')}>Open the decision</Link>}
              {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={adminBtn('secondary')}>Download PDF</a>}
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  )
}
