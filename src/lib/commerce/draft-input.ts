// src/lib/commerce/draft-input.ts
//
// Pure input parsing for the Admin proposal / invoice writers. An ALLOW-LIST: only the fields named here are ever copied out of
// a request body. A total, subtotal, amount, status, version, client_id, merchant_id, project_id, proposal_id, approved_* or
// timestamp in a body has no path to the database — the totals are computed by the database from the lines, and the
// identities are resolved server-side. Money stays a decimal STRING all the way to PostgreSQL (never a JS number).

import { isCurrency, isPlainMoney, isPlainQuantity } from '@/lib/commerce/money'

export interface DraftLineInput { title: string; description: string; quantity: string; unit_price: string }

/** A JSON number or numeric string -> a plain decimal string, or the original value if it cannot be one (the database rejects it). */
function asDecimalString(v: unknown): string {
  if (typeof v === 'number') return Number.isFinite(v) && !/e/i.test(String(v)) ? String(v) : String(NaN)
  return typeof v === 'string' ? v.trim() : ''
}

const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').slice(0, max) : undefined)

export type ParsedDraft = { ok: true; data: Record<string, unknown> } | { ok: false; error: string; field: string }

/** Proposal draft fields. Only keys PRESENT in the body are returned, so a partial save never blanks the rest. */
export function parseProposalDraft(body: unknown): ParsedDraft {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request body.', field: 'body' }
  const b = body as Record<string, unknown>
  const data: Record<string, unknown> = {}

  for (const [key, max] of [['title', 200], ['summary', 4000], ['scope', 20000], ['deliverables', 20000], ['timeline', 4000], ['terms', 20000], ['notes', 4000], ['revision_note', 2000], ['payment_terms', 2000]] as const) {
    if (key in b) {
      const t = text(b[key], max + 1)
      if (t === undefined && b[key] !== null) return { ok: false, error: `${key} must be text.`, field: key }
      data[key] = t ?? ''
    }
  }
  if ('currency' in b) {
    if (!isCurrency(b.currency)) return { ok: false, error: 'Choose USD, NGN, GBP or EUR.', field: 'currency' }
    data.currency = b.currency
  }
  if ('discount_amount' in b) {
    const d = asDecimalString(b.discount_amount) || '0'
    if (!isPlainMoney(d)) return { ok: false, error: 'The discount must be a plain amount with at most two decimals.', field: 'discount_amount' }
    data.discount_amount = d
  }
  for (const key of ['expires_at', 'issue_date'] as const) {
    if (key in b) {
      const v = b[key]
      if (v === null || v === '') data[key] = ''
      else if (typeof v === 'string' && !Number.isNaN(new Date(v).getTime())) data[key] = v
      else return { ok: false, error: 'Enter a valid date.', field: key }
    }
  }
  if ('line_items' in b) {
    if (!Array.isArray(b.line_items) || b.line_items.length > 100) return { ok: false, error: 'Provide up to 100 line items.', field: 'line_items' }
    const lines: DraftLineInput[] = []
    for (const [i, raw] of b.line_items.entries()) {
      const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
      const title = typeof r.title === 'string' ? r.title.trim() : ''
      const quantity = asDecimalString(r.quantity ?? '1') || '1'
      const unit_price = asDecimalString(r.unit_price)
      if (!title || title.length > 200) return { ok: false, error: `Line ${i + 1} needs a title (up to 200 characters).`, field: 'line_items' }
      if (!isPlainQuantity(quantity)) return { ok: false, error: `Line ${i + 1}: the quantity must be greater than zero with at most three decimals.`, field: 'line_items' }
      if (!isPlainMoney(unit_price)) return { ok: false, error: `Line ${i + 1}: the unit price must be a plain amount with at most two decimals.`, field: 'line_items' }
      lines.push({ title, description: typeof r.description === 'string' ? r.description.slice(0, 2000) : '', quantity, unit_price })
    }
    data.line_items = lines
  }
  return { ok: true, data }
}

export interface InvoiceDraftPatch {
  due_date?: string | null
  issue_date?: string | null
  discount_amount?: string
  tax_amount?: string
  notes?: string | null
  payment_instructions?: string | null
  payment_link?: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Editable fields of a DRAFT invoice. Amount / subtotal / status / currency / numbers are not accepted: the database derives or owns them. */
export function parseInvoicePatch(body: unknown): { ok: true; patch: InvoiceDraftPatch } | { ok: false; error: string; field: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request body.', field: 'body' }
  const b = body as Record<string, unknown>
  const patch: InvoiceDraftPatch = {}
  for (const key of ['due_date', 'issue_date'] as const) {
    if (key in b) {
      if (b[key] === null || b[key] === '') patch[key] = null
      else if (typeof b[key] === 'string' && DATE_RE.test(b[key] as string) && !Number.isNaN(new Date(b[key] as string).getTime())) patch[key] = b[key] as string
      else return { ok: false, error: 'Enter a valid date (YYYY-MM-DD).', field: key }
    }
  }
  for (const key of ['discount_amount', 'tax_amount'] as const) {
    if (key in b) {
      const v = asDecimalString(b[key]) || '0'
      if (!isPlainMoney(v)) return { ok: false, error: 'Enter a plain amount with at most two decimals.', field: key }
      patch[key] = v
    }
  }
  for (const [key, max] of [['notes', 4000], ['payment_instructions', 4000]] as const) {
    if (key in b) {
      const v = b[key]
      if (v === null || v === '') patch[key] = null
      else if (typeof v === 'string' && v.length <= max) patch[key] = v.replace(/\r\n/g, '\n')
      else return { ok: false, error: `Up to ${max} characters.`, field: key }
    }
  }
  if ('payment_link' in b) {
    const v = b.payment_link
    if (v === null || v === '') patch.payment_link = null
    else {
      let u: URL | null = null
      try { u = typeof v === 'string' ? new URL(v.trim()) : null } catch { u = null }
      if (!u || u.protocol !== 'https:' || u.username || u.password || u.toString().length > 500) return { ok: false, error: 'The payment link must be a plain https address.', field: 'payment_link' }
      patch.payment_link = u.toString()
    }
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.', field: 'body' }
  return { ok: true, patch }
}

export function parseInvoiceLine(body: unknown, partial: boolean): { ok: true; line: Partial<DraftLineInput> & { sort_order?: number } } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request body.' }
  const b = body as Record<string, unknown>
  const line: Partial<DraftLineInput> & { sort_order?: number } = {}
  if ('title' in b || !partial) {
    const t = typeof b.title === 'string' ? b.title.trim() : ''
    if (!t || t.length > 200) return { ok: false, error: 'A line needs a title (up to 200 characters).' }
    line.title = t
  }
  if ('description' in b) line.description = typeof b.description === 'string' ? b.description.slice(0, 2000) : ''
  if ('quantity' in b || !partial) {
    const q = asDecimalString(b.quantity ?? '1') || '1'
    if (!isPlainQuantity(q)) return { ok: false, error: 'The quantity must be greater than zero with at most three decimals.' }
    line.quantity = q
  }
  if ('unit_price' in b || !partial) {
    const p = asDecimalString(b.unit_price)
    if (!isPlainMoney(p)) return { ok: false, error: 'The unit price must be a plain amount with at most two decimals.' }
    line.unit_price = p
  }
  if ('sort_order' in b) {
    const n = Number(b.sort_order)
    if (!Number.isInteger(n) || n < 0 || n > 1000) return { ok: false, error: 'Invalid order.' }
    line.sort_order = n
  }
  if (partial && Object.keys(line).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, line }
}
