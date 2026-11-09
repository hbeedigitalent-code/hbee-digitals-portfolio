// src/app/admin/growth-assessments/page.tsx
//
// Compatibility route. There is one nav entry, "Growth Reviews": every assessment has exactly one review, so
// this URL was the same record set under another name. Old links and bookmarks keep working: the request is
// forwarded to /admin/growth-reviews with its query string intact (e.g. ?merchant=<merchants.id>).
// Authentication is unchanged: middleware protects /admin/* before this runs.

import { redirect } from 'next/navigation'

export default function AdminGrowthAssessmentsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v))
    else if (typeof value === 'string') query.append(key, value)
  }
  const qs = query.toString()
  redirect(qs ? `/admin/growth-reviews?${qs}` : '/admin/growth-reviews')
}
