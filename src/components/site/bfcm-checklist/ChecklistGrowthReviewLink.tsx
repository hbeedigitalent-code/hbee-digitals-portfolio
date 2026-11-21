'use client'

import Link from 'next/link'

import { trackChecklistEvent } from '@/lib/analytics'
import { siteButtonClasses, type SiteButtonVariant } from '../primitives/SiteButton'
import { SiteArrow } from '../primitives/SiteIcons'
import { growthReviewHref } from './checklist-model'
import { analyticsContext, useChecklistAttribution } from './useChecklistAttribution'

/**
 * A Growth Review button that carries the visit's campaign attribution forward
 * (utm_source / medium / campaign, with utm_content=checklist_to_growth_review)
 * and records bfcm_checklist_growth_review_clicked. Before attribution resolves
 * it is a plain, working /growth-review link. Uses the shared button classes, so
 * it looks exactly like every other site button.
 */
export function ChecklistGrowthReviewLink({
  location,
  variant = 'conversion',
  size = 'lg',
  children,
}: {
  location: string
  variant?: SiteButtonVariant
  size?: 'md' | 'lg'
  children: React.ReactNode
}) {
  const attribution = useChecklistAttribution()
  return (
    <Link
      href={growthReviewHref(attribution)}
      className={siteButtonClasses(variant, size)}
      onClick={() => trackChecklistEvent('bfcm_checklist_growth_review_clicked', analyticsContext(attribution, location))}
    >
      <span>{children}</span>
      <SiteArrow size={16} />
    </Link>
  )
}
