// src/app/admin/growth-reviews/page.tsx
//
// The Growth Review queue (Phase A2). The view lives in GrowthReviewQueue; data and authorization
// (/api/admin/growth-reviews) are unchanged. /admin/growth-assessments forwards here.

import GrowthReviewQueue from '@/components/admin/growth/GrowthReviewQueue'

export default function AdminGrowthReviewsPage() {
  return <GrowthReviewQueue />
}
