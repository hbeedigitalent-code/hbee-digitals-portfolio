'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import ProgramDecisionPanel from '@/components/admin/ProgramDecisionPanel'
import AssessmentAnswers from '@/components/admin/AssessmentAnswers'
import { CLASSIFICATIONS, prefillReview } from '@/lib/admin/review-prefill'
import { displayGrowthClassification } from '@/lib/growth-classification'
import { reviewStatusLabel } from '@/lib/admin/growth-review-queue'
import {
  AdminActionBar,
  AdminActionBarActions,
  AdminActionBarStatus,
  AdminButton,
  AdminCallout,
  AdminErrorState,
  AdminFacts,
  AdminLoadingState,
  AdminNotice,
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

const STATUS_TONE: Record<string, AdminTone> = { pending: 'amber', in_progress: 'blue', completed: 'green' }

const PILLARS: Array<{ key: string; label: string; bar: string }> = [
  { key: 'visibility_score', label: 'Visibility', bar: 'var(--ad-accent)' },
  { key: 'conversion_score', label: 'Conversion', bar: 'var(--ad-signal)' },
  { key: 'retention_score', label: 'Retention', bar: 'var(--ad-success)' },
  { key: 'authority_score', label: 'Authority', bar: 'var(--ad-warning)' },
  { key: 'scalability_score', label: 'Scalability', bar: 'var(--ad-ink)' },
]

const fieldClass = 'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] disabled:opacity-60'

const formDate = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type FormState = {
  review_notes: string
  hgri_score: number
  growth_classification: string
  strengths: string[]
  opportunities: string[]
  visibility_score: number
  conversion_score: number
  retention_score: number
  authority_score: number
  scalability_score: number
  status: string
}

const EMPTY_FORM: FormState = {
  review_notes: '',
  hgri_score: 0,
  growth_classification: 'Growth Potential',
  strengths: [''],
  opportunities: [''],
  visibility_score: 0,
  conversion_score: 0,
  retention_score: 0,
  authority_score: 0,
  scalability_score: 0,
  status: 'pending',
}

export default function AdminGrowthReviewDetailPage({ params }: PageProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [initialJson, setInitialJson] = useState('')
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string; profileId?: string } | null>(null)

  // `quiet` refreshes in place (after a save or a decision) without replacing the page with a spinner.
  const fetchReview = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      // /api/admin/growth-reviews/[id] verifies session, user-bound admin 2FA and active admin membership.
      const response = await fetch(`/api/admin/growth-reviews/${params.id}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (response.status === 404) {
        setLoadError(null)
        setReview(null)
        return
      }
      if (!response.ok || !payload?.review) {
        // Surfaced explicitly: a denied or failed load must not render as an empty review form.
        setLoadError(payload?.error || 'Could not load this review. Please refresh and try again.')
        return
      }

      const data = payload.review
      setLoadError(null)
      setReview(data)
      setMerchant(data.merchant)
      setAssessment(data.assessment)

      // Assessment pillars are 0–20; the review sliders are 0–100. The prefill boundary
      // (src/lib/admin/review-prefill.ts) multiplies by 5 and keeps stored review values.
      const prefill = prefillReview(data, data.assessment)
      const next: FormState = {
        review_notes: data.review_notes || '',
        strengths: data.strengths?.length ? data.strengths : [''],
        opportunities: data.opportunities?.length ? data.opportunities : [''],
        status: data.status || 'pending',
        ...prefill,
      } as FormState
      setFormData(next)
      setInitialJson(JSON.stringify(next))
    } catch {
      setLoadError('Could not load this review. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { void fetchReview() }, [fetchReview])

  const reviewPayload = () => ({
    review_notes: formData.review_notes,
    hgri_score: formData.hgri_score,
    growth_classification: formData.growth_classification,
    strengths: formData.strengths.filter((s) => s.trim()),
    opportunities: formData.opportunities.filter((s) => s.trim()),
    visibility_score: formData.visibility_score,
    conversion_score: formData.conversion_score,
    retention_score: formData.retention_score,
    authority_score: formData.authority_score,
    scalability_score: formData.scalability_score,
  })

  async function handleSave() {
    setSaving(true)
    setNotice(null)
    try {
      // PATCH cannot set status or completed_at: completing a review still goes through
      // /api/growth-reviews/[id]/complete, which generates the Growth Profile.
      const response = await fetch(`/api/admin/growth-reviews/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(reviewPayload()),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setNotice({ tone: 'error', text: payload?.error || 'Failed to save the review. Please try again.' })
        return
      }

      await fetchReview(true)
      setNotice({ tone: 'success', text: 'Review notes saved.' })
    } catch {
      setNotice({ tone: 'error', text: 'An error occurred while saving.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCompleteReview() {
    if (!confirm('Complete this review? This prepares the growth profile. It does NOT approve the merchant for the program — approval is a separate decision.')) return

    setSaving(true)
    setGenerating(true)
    setNotice(null)
    try {
      // `allowReleasedUpdate` starts false. The server refuses to overwrite a profile the merchant has already
      // been shown under an approval, and this retries ONCE with the explicit authorization after a second confirm.
      const send = (allowReleasedUpdate: boolean) =>
        fetch(`/api/growth-reviews/${params.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...reviewPayload(),
            merchant_id: merchant?.id,
            assessment_id: assessment?.id,
            ...(allowReleasedUpdate ? { allow_released_update: true } : {}),
          }),
        })

      let response = await send(false)
      let result = await response.json().catch(() => null)

      if (response.status === 409 && result?.code === 'profile_already_released') {
        if (!confirm(`${result.error}\n\nReplace the released Growth Profile content? This will be recorded against your account.`)) {
          return
        }
        response = await send(true)
        result = await response.json().catch(() => null)
      }

      if (!response.ok) {
        setNotice({ tone: 'error', text: result?.error || 'Failed to complete the review. Please try again.' })
        return
      }

      await fetchReview(true)
      setNotice({
        tone: 'success',
        text: result?.released_content_updated
          ? 'Review completed. The released Growth Profile content was replaced, and the change was recorded.'
          : 'Review completed and the Growth Profile prepared. Programme approval is a separate decision, below.',
        profileId: result?.profile_id,
      })
    } catch {
      setNotice({ tone: 'error', text: 'An error occurred while completing the review.' })
    } finally {
      setSaving(false)
      setGenerating(false)
    }
  }

  function updateList(field: 'strengths' | 'opportunities', index: number, value: string) {
    const next = [...formData[field]]
    next[index] = value
    setFormData({ ...formData, [field]: next })
  }

  if (loading) return <AdminLoadingState label="Loading the review…" />

  // A failed or denied load is distinct from "this review does not exist".
  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminErrorState title="Could not load this review" message={loadError} onRetry={() => fetchReview()} />
        <div className="text-center"><AdminButton variant="secondary" href="/admin/growth-reviews">Back to Growth Reviews</AdminButton></div>
      </div>
    )
  }

  if (!review) {
    return (
      <AdminPageHeader eyebrow="Growth" title="Review not found" description="The growth review you are looking for does not exist.">
        <AdminButton variant="primary" href="/admin/growth-reviews">Back to Growth Reviews</AdminButton>
      </AdminPageHeader>
    )
  }

  const classifications = [...CLASSIFICATIONS]
  const isCompleted = formData.status === 'completed'
  const dirty = JSON.stringify(formData) !== initialJson
  const name = merchant?.business_name || 'Unnamed business'
  const sections: Array<[string, string]> = [['business', 'Business'], ['answers', 'Answers'], ['findings', 'Findings'], ['history', 'History'], ...(isCompleted && assessment?.id ? ([['decision', 'Decision']] as Array<[string, string]>) : [])]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Growth Reviews', href: '/admin/growth-reviews' }, { label: name }]}
        eyebrow="Growth Review"
        title={name}
        description={[merchant?.contact_name, merchant?.email, assessment?.created_at && `Submitted ${new Date(assessment.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ')}
        meta={
          <>
            <AdminStatusBadge tone={STATUS_TONE[formData.status] || 'neutral'} dot>{reviewStatusLabel(formData.status)}</AdminStatusBadge>
            {formData.hgri_score > 0 && <AdminStatusBadge tone="dark">HGRI {formData.hgri_score}</AdminStatusBadge>}
            {formData.growth_classification && <AdminStatusBadge>{displayGrowthClassification(formData.growth_classification)}</AdminStatusBadge>}
          </>
        }
      >
        {merchant?.id && <Link href={`/admin/merchants/${merchant.id}`} className={adminBtn('secondary')}>Merchant record</Link>}
      </AdminPageHeader>

      {notice && (
        <AdminNotice tone={notice.tone}>
          {notice.text}
          {notice.profileId && <> <Link href={`/admin/growth-profiles/${notice.profileId}`} className="font-semibold underline underline-offset-4">Open the Growth Profile</Link></>}
        </AdminNotice>
      )}

      {isCompleted ? (
        <AdminCallout tone="info" title="Next: record the programme decision">
          The review is complete and the Growth Profile is prepared, but it is <strong>not</strong> released to the merchant. Approving or declining is a separate, deliberate decision in the Decision section below.
        </AdminCallout>
      ) : (
        <AdminCallout tone="attention" title="This review needs a human review">
          Read the answers, set the scores, strengths and opportunities, then complete the review. Completing prepares the Growth Profile; it does not approve the merchant.
        </AdminCallout>
      )}

      <div role="navigation" aria-label="Review sections" className="sticky top-0 z-20 flex gap-1.5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-1.5 backdrop-blur">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--accent)]">{label}</a>
        ))}
      </div>

      {/* Merchant context beside the review controls (≥1280px); it stays in view while the editor scrolls. Below
          1280px everything stacks in reading order: business, answers, findings, history, decision. */}
      <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 space-y-6 xl:col-span-5">
          <AdminSection id="business" title="Who is this business?" description="The merchant record this assessment belongs to.">
            <AdminFacts
              items={[
                { label: 'Business', value: merchant?.business_name },
                { label: 'Contact', value: merchant?.contact_name },
                { label: 'Email', value: merchant?.email, href: merchant?.email ? `mailto:${merchant.email}` : undefined },
                { label: 'Website', value: merchant?.website, href: merchant?.website || undefined, external: true },
                { label: 'Industry', value: merchant?.industry },
                { label: 'Country', value: merchant?.country },
                { label: 'Business stage', value: merchant?.business_stage },
                { label: 'Store age', value: merchant?.store_age },
              ]}
            />
          </AdminSection>

          <div id="answers" className="scroll-mt-16">
            <AssessmentAnswers sections={review.answers || []} submittedAt={assessment?.created_at} />
          </div>
        </div>

        <div className="min-w-0 space-y-6 xl:col-span-7">
          <AdminSection id="findings" title="What did Hbee find?" description="Scores, strengths and opportunities. Pillar scores are pre-filled from the assessment and can be adjusted.">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-4">
                  <label htmlFor="hgri" className="text-sm font-semibold text-[var(--text-primary)]">HGRI™ score</label>
                  <input id="hgri" type="range" min="0" max="100" value={formData.hgri_score} disabled={isCompleted} onChange={(e) => setFormData({ ...formData, hgri_score: parseInt(e.target.value) })} className="min-w-0 flex-1 accent-[var(--accent)] disabled:opacity-60" />
                  <span className="min-w-[3rem] text-right text-2xl font-extrabold text-[var(--text-primary)]">{formData.hgri_score}</span>
                </div>
                <label htmlFor="classification" className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">Classification</label>
                <select id="classification" value={formData.growth_classification} disabled={isCompleted} onChange={(e) => setFormData({ ...formData, growth_classification: e.target.value })} className={`${fieldClass} mt-1`}>
                  {classifications.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Pillar scores</h3>
                <div className="space-y-4">
                  {PILLARS.map(({ key, label, bar }) => {
                    const value = (formData[key as keyof FormState] as number) || 0
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <label htmlFor={key} className="text-sm text-[var(--text-secondary)]">{label}</label>
                          <input id={key} type="number" min="0" max="100" value={value} disabled={isCompleted} onChange={(e) => setFormData({ ...formData, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className={`${fieldClass} !w-20 text-center`} />
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(value, 100)}%`, background: bar }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {(['strengths', 'opportunities'] as const).map((field) => (
                  <div key={field}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize text-[var(--text-primary)]">{field}</h3>
                      {!isCompleted && <button type="button" onClick={() => setFormData({ ...formData, [field]: [...formData[field], ''] })} className="text-xs font-semibold text-[var(--accent)] hover:underline">+ Add</button>}
                    </div>
                    <div className="space-y-2">
                      {formData[field].map((entry, index) => (
                        <div key={index} className="flex gap-2">
                          <input type="text" aria-label={`${field === 'strengths' ? 'Strength' : 'Opportunity'} ${index + 1}`} value={entry} disabled={isCompleted} onChange={(e) => updateList(field, index, e.target.value)} placeholder={field === 'strengths' ? 'Enter a strength…' : 'Enter an opportunity…'} className={fieldClass} />
                          {!isCompleted && formData[field].length > 1 && (
                            <button type="button" aria-label={`Remove ${field === 'strengths' ? 'strength' : 'opportunity'} ${index + 1}`} onClick={() => setFormData({ ...formData, [field]: formData[field].filter((_, i) => i !== index) })} className="rounded-lg px-2 text-[var(--ad-danger)] hover:bg-[var(--ad-danger-soft)]">
                              <X aria-hidden="true" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="review-notes" className="text-sm font-semibold text-[var(--text-primary)]">Review notes</label>
                <textarea id="review-notes" value={formData.review_notes} disabled={isCompleted} onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })} rows={4} placeholder="Add your review notes here…" className={`${fieldClass} mt-1`} />
              </div>

              {isCompleted && <p className="text-xs text-[var(--text-muted)]">A completed review is read-only here.</p>}
            </div>
          </AdminSection>

          <AdminSection id="history" title="What has happened?" description="The review's own timeline. Programme decisions are listed under Decision.">
            <AdminFacts
              items={[
                { label: 'Assessment submitted', value: formDate(assessment?.created_at) },
                { label: 'Review created', value: formDate(review.created_at) },
                { label: 'Last updated', value: formDate(review.updated_at) },
                { label: 'Review completed', value: formDate(review.completed_at) },
              ]}
            />
          </AdminSection>

          {isCompleted && assessment?.id && (
            <div id="decision" className="scroll-mt-16">
              <ProgramDecisionPanel assessmentId={assessment.id} onRecorded={() => { void fetchReview(true) }} />
            </div>
          )}
        </div>
      </div>

      {!isCompleted && (
        <AdminActionBar>
          <AdminActionBarStatus dirty={dirty && !saving}>{saving ? (generating ? 'Preparing the Growth Profile…' : 'Saving changes…') : dirty ? 'Unsaved changes' : 'No unsaved changes'}</AdminActionBarStatus>
          <AdminActionBarActions>
            <button type="button" onClick={handleSave} disabled={saving || !dirty} className={adminBtn('secondary')}>{saving && !generating ? 'Saving…' : 'Save notes'}</button>
            <button type="button" onClick={handleCompleteReview} disabled={saving || generating} className={adminBtn('primary')}>{generating ? 'Generating profile…' : 'Complete review'}</button>
          </AdminActionBarActions>
        </AdminActionBar>
      )}
    </div>
  )
}
