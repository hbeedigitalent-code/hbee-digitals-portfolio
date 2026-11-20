// src/lib/commerce/invoice-status.ts
//
// Invoice states. Stored: draft, issued, partially_paid, paid, void. "Overdue" is DERIVED, never stored and never written
// by a page load: an invoice is overdue while it is issued or partially paid AND its due date is before today.

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus | 'overdue', string> = {
  draft: 'Draft',
  issued: 'Issued',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  void: 'Void',
  overdue: 'Overdue',
}

export function isInvoiceStatus(v: unknown): v is InvoiceStatus {
  return typeof v === 'string' && (INVOICE_STATUSES as readonly string[]).includes(v)
}

/** Calendar date (YYYY-MM-DD) of "today" in the business time zone, so overdue flips at local midnight. */
export function todayInBusinessZone(now: Date = new Date(), timeZone = 'Africa/Lagos'): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function isOverdue(inv: { status: unknown; due_date: unknown }, today: string = todayInBusinessZone()): boolean {
  if (inv.status !== 'issued' && inv.status !== 'partially_paid') return false
  if (typeof inv.due_date !== 'string') return false
  const due = inv.due_date.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(due) && due < today
}

/** The status to SHOW: the stored one, or the derived 'overdue'. */
export function displayInvoiceStatus(inv: { status: unknown; due_date: unknown }, today?: string): InvoiceStatus | 'overdue' {
  if (isOverdue(inv, today)) return 'overdue'
  return isInvoiceStatus(inv.status) ? inv.status : 'draft'
}

/** Legal Admin actions for a stored status. Payments are recorded through the ledger, never by setting a status. */
export function invoiceActions(status: unknown): Array<'edit' | 'issue' | 'void' | 'payment'> {
  switch (status) {
    case 'draft':
      return ['edit', 'issue', 'void']
    case 'issued':
      return ['payment', 'void']
    case 'partially_paid':
      return ['payment']
    default:
      return []
  }
}
