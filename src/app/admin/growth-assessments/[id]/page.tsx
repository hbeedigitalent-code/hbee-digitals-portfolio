// src/app/admin/growth-assessments/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UUID_RE, type QueueReview } from '@/lib/admin/growth-review-queue'
import { AdminButton, AdminErrorState, AdminLoadingState, AdminPageHeader } from '@/components/admin/ui/AdminUi'

/**
 * Resolver (Phase A2). This URL used to be a second, older copy of the review editor that only worked when
 * given a growth_reviews id, without the assessment answers or the programme decision panel. Links elsewhere
 * (the dashboard, the notification fallback) pass an ASSESSMENT id, which that editor could not load.
 *
 * Each assessment has exactly one review, so this page finds it (by assessment id, or review id for any old
 * link) through the same admin-gated list route and continues to the single canonical review page. Nothing
 * is written and no new endpoint is involved.
 */
export default function AdminAssessmentResolverPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [state, setState] = useState<'resolving' | 'missing' | 'error'>('resolving')
  const [message, setMessage] = useState('')

  const resolve = useCallback(async () => {
    setState('resolving')
    if (!UUID_RE.test(params.id)) {
      setState('missing')
      return
    }
    try {
      const response = await fetch('/api/admin/growth-reviews?status=all', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.reviews)) {
        setMessage(payload?.error || 'Could not look up this assessment. Please try again.')
        setState('error')
        return
      }
      const reviews: QueueReview[] = payload.reviews
      const match = reviews.find((r) => r.assessment_id === params.id) || reviews.find((r) => r.id === params.id)
      if (match) router.replace(`/admin/growth-reviews/${match.id}`)
      else setState('missing')
    } catch {
      setMessage('Could not look up this assessment. Please try again.')
      setState('error')
    }
  }, [params.id, router])

  useEffect(() => { void resolve() }, [resolve])

  if (state === 'resolving') return <AdminLoadingState label="Opening the review…" />
  if (state === 'error') return <AdminErrorState title="Could not open this assessment" message={message} onRetry={resolve} />
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Growth" title="Assessment not found" description="No review exists for this assessment. It may have been removed, or the link is out of date.">
        <AdminButton variant="primary" href="/admin/growth-reviews">Back to Growth Reviews</AdminButton>
      </AdminPageHeader>
    </div>
  )
}
