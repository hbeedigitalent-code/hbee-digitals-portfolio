/**
 * Inquiry list logic (Phase A2). Pure. contact_submissions only carries is_read as workflow state (its `status`
 * column is written as 'new' on insert and never changed), so the only attention state offered is unread/read.
 */

export interface Inquiry {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
  company?: string | null
  service?: string | null
  budget?: string | null
  timeline?: string | null
  website?: string | null
  message: string
  is_read: boolean
  created_at: string
}

export type InquiryFilter = 'all' | 'unread' | 'read'

export function inquiryCounts(items: Inquiry[]): Record<InquiryFilter, number> {
  const unread = items.filter((i) => !i.is_read).length
  return { all: items.length, unread, read: items.length - unread }
}

export function filterInquiries(items: Inquiry[], opts: { filter: InquiryFilter; query: string }): Inquiry[] {
  const q = opts.query.trim().toLowerCase()
  return items.filter((item) => {
    if (opts.filter === 'unread' && item.is_read) return false
    if (opts.filter === 'read' && !item.is_read) return false
    if (!q) return true
    return [item.full_name, item.email, item.company, item.service, item.message].some((field) => (field || '').toLowerCase().includes(q))
  })
}

/** First meaningful line of a message, for the list (enquiry budget/timeline are appended after a "—" rule). */
export function inquiryPreview(message: string | null | undefined, max = 160): string {
  const text = (message || '').split(/\n—\n/)[0].split(/\n\n--- Campaign attribution ---\n/)[0].replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/* ── Free Growth Review campaign requests ───────────────────────────────────
 * POST /api/growth-review-request stores these in the same table, marked by
 * `service`. Pure helpers only: the inbox adds a compact badge, nothing else changes. */

/** Must equal GROWTH_REQUEST_SERVICE in validators/growth-request-payload.ts (kept literal so this module stays dependency-free). */
export const GROWTH_REVIEW_SERVICE = 'Free Growth Review (campaign)'
const ATTRIBUTION_MARKER = '--- Campaign attribution ---'

export function isGrowthReviewRequest(item: { service?: string | null }): boolean {
  return item.service === GROWTH_REVIEW_SERVICE
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  twitter: 'X',
  x: 'X',
  tiktok: 'TikTok',
  email: 'Email',
  google: 'Google',
}

/** "LinkedIn" / "Instagram" from the stored utm_source, or null when unattributed. Never throws. */
export function growthReviewSource(message: string | null | undefined): string | null {
  const text = message || ''
  const at = text.indexOf(ATTRIBUTION_MARKER)
  if (at === -1) return null
  const match = text.slice(at).match(/^utm_source: (.+)$/m)
  const raw = match?.[1]?.trim()
  if (!raw) return null
  const key = raw.toLowerCase()
  return SOURCE_LABELS[key] ?? raw.slice(0, 30)
}
