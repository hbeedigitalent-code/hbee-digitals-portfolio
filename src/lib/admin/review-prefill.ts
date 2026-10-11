// src/lib/admin/review-prefill.ts
//
// The assessment → human-review PREFILL boundary (Phase 16.7).
//
// HGRI v1 stores each assessment pillar on a 0–20 scale (total 0–100). The admin
// review works on 0–100 sliders and its values are authoritative for the Growth
// Profile (recommendations treat a pillar < 50 as weak). Feeding a raw 0–20 value
// into a 0–100 slider made almost every pillar look weak — an assessment
// Conversion of 11/20 arrived as 11/100 instead of 55/100.
//
// THE FIX LIVES HERE AND ONLY HERE: when a review form is prefilled from its
// assessment, each pillar is multiplied by 5. Nothing is written back — the
// assessment record, its stored HGRI total and the scoring code are untouched,
// and a review's own stored values always win over the assessment.
//
// Pure (no React, no server imports) so the review pages and the tests share it.

export const ASSESSMENT_PILLAR_MAX = 20
export const REVIEW_PILLAR_MAX = 100
/** 100 / 20 */
export const PILLAR_SCALE = REVIEW_PILLAR_MAX / ASSESSMENT_PILLAR_MAX

export const PILLAR_KEYS = [
  'visibility_score',
  'conversion_score',
  'retention_score',
  'authority_score',
  'scalability_score',
] as const
export type PillarKey = (typeof PILLAR_KEYS)[number]

/** The four canonical HGRI classifications, in the names the admin and clients see. */
export const CLASSIFICATIONS = ['Foundation Stage', 'Growth Potential', 'Growth Ready', 'Scale Ready'] as const
export type Classification = (typeof CLASSIFICATIONS)[number]
export const DEFAULT_CLASSIFICATION: Classification = 'Growth Potential'

/** One assessment pillar (0–20) as a review value (0–100). Non-numeric → 0. */
export function assessmentPillarToReview(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.min(Math.max(Math.round(n * PILLAR_SCALE), 0), REVIEW_PILLAR_MAX)
}

/**
 * A classification in its canonical name, or null if it is not one of the four.
 * The older plain "Foundation" is the same band as "Foundation Stage".
 */
export function canonicalClassification(value: unknown): Classification | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v === 'Foundation') return 'Foundation Stage'
  return (CLASSIFICATIONS as readonly string[]).includes(v) ? (v as Classification) : null
}

interface ReviewLike {
  status?: string | null
  hgri_score?: number | null
  growth_classification?: string | null
  [key: string]: unknown
}
interface AssessmentLike {
  hgri_score?: number | null
  /** What the assessment submission actually writes. */
  classification?: string | null
  /** Legacy column name; read only as a fallback. */
  growth_classification?: string | null
  [key: string]: unknown
}

export interface ReviewPrefill {
  hgri_score: number
  growth_classification: string
  visibility_score: number
  conversion_score: number
  retention_score: number
  authority_score: number
  scalability_score: number
}

/**
 * The scores and classification a review form should open with.
 *
 *  - A COMPLETED review is shown exactly as stored (zeros included); nothing is
 *    derived from the assessment.
 *  - Otherwise, a pillar the reviewer has already set (a non-zero stored value)
 *    is kept. Only a pillar still at its empty value (0 / null) is prefilled
 *    from the assessment, multiplied by 5.
 *  - Classification: the review's own value, else the assessment's `classification`
 *    (the field the submission writes), else the legacy `growth_classification`,
 *    else "Growth Potential" — always in canonical naming.
 *  - hgri_score is already 0–100 on both sides and is not rescaled.
 */
export function prefillReview(review: ReviewLike | null | undefined, assessment: AssessmentLike | null | undefined): ReviewPrefill {
  const completed = review?.status === 'completed'
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

  const out = {} as Record<PillarKey, number>
  for (const key of PILLAR_KEYS) {
    const own = num(review?.[key])
    out[key] = completed || own !== 0 ? own : assessmentPillarToReview(assessment?.[key])
  }

  const ownClass = canonicalClassification(review?.growth_classification)
  const storedClass = typeof review?.growth_classification === 'string' ? review.growth_classification.trim() : ''
  let classification: string
  if (completed) {
    // Shown as stored; only the plain "Foundation" naming is mapped to its canonical band name.
    classification = ownClass ?? (storedClass || DEFAULT_CLASSIFICATION)
  } else {
    classification =
      ownClass ??
      canonicalClassification(assessment?.classification) ??
      canonicalClassification(assessment?.growth_classification) ??
      DEFAULT_CLASSIFICATION
  }

  const ownHgri = num(review?.hgri_score)
  return {
    hgri_score: completed || ownHgri !== 0 ? ownHgri : num(assessment?.hgri_score),
    growth_classification: classification,
    ...out,
  }
}
