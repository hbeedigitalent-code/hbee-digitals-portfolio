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
  const text = (message || '').split(/\n—\n/)[0].replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
