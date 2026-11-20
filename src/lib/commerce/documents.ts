// src/lib/commerce/documents.ts
//
// SERVER-ONLY. Loads the AUTHORITATIVE records behind a proposal or an invoice document, applying the visibility rules in one
// place, for both the JSON endpoints and the PDF routes — so what the page shows and what the PDF prints cannot diverge.
//
//   CLIENT scope  ownership is proved in the query itself (client_id = the session's client, or the invoice's project owned by
//                 that client). A document that is missing, someone else's, or not yet delivered answers null, which the route
//                 turns into the same 404 for all three (no enumeration).
//   ADMIN scope   any document; a draft proposal is previewed from its live rows and marked as a draft.
//
// What is returned is an allow-list. Internal notes (proposals.notes), admin identity, change-request text of other versions,
// storage paths and payment links of other clients never appear in these shapes.

import { minorToString, sumMinor, toMinor } from '@/lib/commerce/money'
import { displayInvoiceStatus, INVOICE_STATUS_LABELS } from '@/lib/commerce/invoice-status'
import { normalizeProposalStatus } from '@/lib/proposal-status'
import type { InvoicePdfInput, ProposalPdfInput, PdfLineItem } from '@/lib/commerce/pdf'

if (typeof window !== 'undefined') {
  throw new Error('documents.ts is server-only and must not be imported by client code')
}

export const CLIENT_VISIBLE_PROPOSAL_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested', 'declined', 'rejected', 'converted', 'expired']
export const CLIENT_VISIBLE_INVOICE_STATUSES = ['issued', 'partially_paid', 'paid', 'void']

const PROPOSAL_COLUMNS =
  'id, proposal_number, title, status, client_id, merchant_id, currency, subtotal, discount_amount, total, version, approved_version, converted_to_project_id, ' +
  'summary, scope, deliverables, timeline, terms, pricing, issue_date, expires_at, sent_at, accepted_at, declined_at, revision_note, created_at, updated_at'

export interface ProposalView {
  id: string
  number: string
  title: string
  status: string
  displayStatus: string
  currency: string
  version: number
  shownVersion: number
  approvedVersion: number | null
  converted: boolean
  projectId: string | null
  summary: string | null
  scope: string | null
  deliverables: string | null
  timeline: string | null
  terms: string | null
  paymentTerms: string | null
  issueDate: string | null
  expiresAt: string | null
  sentAt: string | null
  acceptedAt: string | null
  declinedAt: string | null
  subtotal: string
  discount: string
  total: string
  lines: PdfLineItem[]
  isDraftPreview: boolean
  clientId: string | null
  merchantId: string | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const money = (v: unknown): string => {
  const m = toMinor(v)
  return m === null ? '0.00' : minorToString(m)
}

/** Loads a proposal as it should be SHOWN: the approved version once approved, else the version the client was last sent. */
export async function loadProposalView(
  db: any,
  proposalId: string,
  scope: { clientId: string } | { admin: true; version?: number },
): Promise<{ view: ProposalView; client: { name: string; business: string | null } | null } | null> {
  let q = db.from('proposals').select(PROPOSAL_COLUMNS).eq('id', proposalId)
  if ('clientId' in scope) q = q.eq('client_id', scope.clientId).in('status', CLIENT_VISIBLE_PROPOSAL_STATUSES)
  const { data: p, error } = await q.maybeSingle()
  if (error || !p) return null

  const status = String(p.status)
  const isAdmin = 'admin' in scope
  const wanted = isAdmin && scope.version ? scope.version : p.approved_version ?? p.version

  let snapshot: any = null
  const { data: snap } = await db.from('proposal_versions').select('*').eq('proposal_id', p.id).eq('version_number', wanted).maybeSingle()
  snapshot = snap

  let lines: PdfLineItem[] = []
  let src: any = p
  let draftPreview = false
  if (snapshot) {
    src = snapshot
    lines = (Array.isArray(snapshot.line_items) ? snapshot.line_items : []).map((l: any) => ({
      title: String(l.title ?? ''),
      description: str(l.description),
      quantity: String(l.quantity ?? '1'),
      unit_price: money(l.unit_price),
      amount: money(l.amount),
    }))
  } else if (isAdmin) {
    // a draft (or a revision under way) has no snapshot for this number yet: preview the live rows
    draftPreview = true
    const { data: rows } = await db.from('proposal_line_items').select('title, description, quantity, unit_price, amount, sort_order').eq('proposal_id', p.id).order('sort_order', { ascending: true })
    lines = (rows || []).map((l: any) => ({ title: l.title, description: str(l.description), quantity: String(l.quantity), unit_price: money(l.unit_price), amount: money(l.amount) }))
  } else {
    return null // a client never sees a proposal that has no delivered version
  }

  let client: { name: string; business: string | null } | null = null
  if (p.client_id) {
    const { data: c } = await db.from('clients').select('full_name, business_name').eq('id', p.client_id).maybeSingle()
    if (c) client = { name: String(c.full_name || c.business_name || 'Client'), business: str(c.business_name) && c.full_name ? String(c.business_name) : null }
  }

  const norm = normalizeProposalStatus(status)
  const view: ProposalView = {
    id: p.id,
    number: String(p.proposal_number ?? ''),
    title: String(src.title ?? p.title ?? ''),
    status,
    displayStatus: norm === 'unknown' ? status : norm,
    currency: String(src.currency ?? p.currency ?? 'USD'),
    version: Number(p.version ?? 1),
    shownVersion: Number(snapshot ? snapshot.version_number : p.version ?? 1),
    approvedVersion: p.approved_version ?? null,
    converted: norm === 'approved' && !!p.converted_to_project_id,
    projectId: p.converted_to_project_id ?? null,
    summary: str(src.summary),
    scope: str(src.scope),
    deliverables: str(src.deliverables),
    timeline: str(src.timeline),
    terms: str(src.terms),
    // the delivered VERSION is authoritative for what the client saw; only an unsent draft preview reads the live fields
    paymentTerms: snapshot ? str(snapshot.payment_terms) : str(p.pricing?.payment_terms),
    issueDate: str(src.issue_date) ?? str(p.issue_date),
    expiresAt: str(src.expires_at) ?? str(p.expires_at),
    sentAt: str(snapshot?.sent_at) ?? str(p.sent_at),
    acceptedAt: str(p.accepted_at),
    declinedAt: str(p.declined_at),
    subtotal: money(src.subtotal ?? p.subtotal),
    discount: money(src.discount_amount ?? p.discount_amount),
    total: money(src.total ?? p.total),
    lines,
    isDraftPreview: draftPreview,
    clientId: isAdmin ? p.client_id ?? null : null,
    merchantId: isAdmin ? p.merchant_id ?? null : null,
  }
  return { view, client }
}

// States in which the proposal still awaits the client's decision: the only time the "Next steps" panel is printed.
const AWAITING_DECISION = ['sent', 'viewed', 'changes_requested']
// States worth naming on the document itself; "sent" / "viewed" are simply the proposal being out for review.
const DOCUMENT_STATUS_LABELS: Record<string, string> = { approved: 'Approved', declined: 'Declined', rejected: 'Declined', expired: 'Expired' }

export function proposalPdfInput(view: ProposalView, client: { name: string; business: string | null } | null): ProposalPdfInput {
  const awaiting = AWAITING_DECISION.includes(view.displayStatus)
  return {
    number: view.number,
    version: view.shownVersion,
    title: view.title,
    preparedFor: { name: client?.name ?? 'Client', business: client?.business ?? null },
    // a delivered version always carries the issue date the database stamped when it was sent; the sent timestamp is the same
    // fact for a legacy row without one. A draft has none and says so on the document: no date is ever invented.
    issueDate: view.issueDate ?? (view.isDraftPreview ? null : view.sentAt),
    expiresAt: view.expiresAt,
    currency: view.currency,
    summary: view.summary,
    scope: view.scope,
    deliverables: view.deliverables,
    timeline: view.timeline,
    terms: view.terms,
    paymentTerms: view.paymentTerms,
    lines: view.lines,
    subtotal: view.subtotal,
    discount: view.discount,
    total: view.total,
    watermark: view.isDraftPreview ? 'DRAFT PREVIEW — NOT YET SENT TO THE CLIENT' : null,
    statusLabel: view.isDraftPreview ? null : DOCUMENT_STATUS_LABELS[view.displayStatus] ?? null,
    // the panel is shown on a draft preview too: it is what the client will read once the proposal is sent
    showNextSteps: view.isDraftPreview || awaiting,
  }
}

const INVOICE_COLUMNS =
  'id, invoice_number, project_id, proposal_id, amount, subtotal, discount_amount, tax_amount, currency, status, issue_date, due_date, issued_at, paid_at, voided_at, notes, payment_instructions, payment_link, created_at, updated_at'

export interface InvoiceView {
  id: string
  number: string
  status: string
  displayStatus: string
  statusLabel: string
  currency: string
  issueDate: string | null
  dueDate: string | null
  issuedAt: string | null
  paidAt: string | null
  subtotal: string
  discount: string
  tax: string
  total: string
  paid: string
  balance: string
  notes: string | null
  paymentInstructions: string | null
  paymentLink: string | null
  lines: PdfLineItem[]
  payments: Array<{ id: string; paid_at: string; amount: string; method: string | null; reference: string | null }>
  project: { id: string; name: string; reference: string | null }
  proposalId: string | null
  proposalNumber: string | null
  clientId: string | null
}

export async function loadInvoiceView(
  db: any,
  invoiceId: string,
  scope: { clientId: string } | { admin: true },
): Promise<{ view: InvoiceView; client: { name: string; business: string | null } | null } | null> {
  const { data: inv, error } = await db.from('project_invoices').select(INVOICE_COLUMNS).eq('id', invoiceId).maybeSingle()
  if (error || !inv) return null
  const isAdmin = 'admin' in scope

  const { data: project } = await db.from('projects').select('id, project_name, project_id, client_id').eq('id', inv.project_id).maybeSingle()
  if (!project) return null
  if (!isAdmin) {
    // ownership: the invoice's PROJECT belongs to the session's client, and the invoice has been delivered
    if (project.client_id !== scope.clientId || !CLIENT_VISIBLE_INVOICE_STATUSES.includes(String(inv.status))) return null
  }

  const [linesRes, paymentsRes, proposalRes, clientRes] = await Promise.all([
    db.from('invoice_line_items').select('title, description, quantity, unit_price, line_amount, sort_order').eq('invoice_id', inv.id).order('sort_order', { ascending: true }),
    db.from('invoice_payments').select('id, amount, paid_at, method, reference, created_at').eq('invoice_id', inv.id).order('paid_at', { ascending: true }),
    inv.proposal_id ? db.from('proposals').select('proposal_number').eq('id', inv.proposal_id).maybeSingle() : Promise.resolve({ data: null }),
    project.client_id ? db.from('clients').select('full_name, business_name').eq('id', project.client_id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const lines: PdfLineItem[] = (linesRes.data || []).map((l: any) => ({
    title: String(l.title ?? ''), description: str(l.description), quantity: String(l.quantity), unit_price: money(l.unit_price), amount: money(l.line_amount),
  }))
  const payments = (paymentsRes.data || []).map((p: any) => ({ id: p.id, paid_at: String(p.paid_at), amount: money(p.amount), method: str(p.method), reference: str(p.reference) }))
  const totalMinor = toMinor(inv.amount) ?? 0n
  const paidMinor = sumMinor(payments.map((p: { amount: string }) => toMinor(p.amount)))
  const shown = displayInvoiceStatus({ status: inv.status, due_date: inv.due_date })

  const c = clientRes.data
  const view: InvoiceView = {
    id: inv.id,
    number: String(inv.invoice_number ?? ''),
    status: String(inv.status),
    displayStatus: shown,
    statusLabel: INVOICE_STATUS_LABELS[shown],
    currency: String(inv.currency ?? 'USD'),
    issueDate: str(inv.issue_date),
    dueDate: str(inv.due_date)?.slice(0, 10) ?? null,
    issuedAt: str(inv.issued_at),
    paidAt: str(inv.paid_at),
    subtotal: money(inv.subtotal),
    discount: money(inv.discount_amount),
    tax: money(inv.tax_amount),
    total: minorToString(totalMinor),
    paid: minorToString(paidMinor),
    balance: minorToString(totalMinor - paidMinor),
    notes: str(inv.notes),
    paymentInstructions: str(inv.payment_instructions),
    paymentLink: /^https:\/\//i.test(String(inv.payment_link ?? '')) ? String(inv.payment_link) : null,
    lines,
    payments,
    project: { id: project.id, name: String(project.project_name || project.project_id || 'Project'), reference: str(project.project_id) },
    proposalId: inv.proposal_id ?? null,
    proposalNumber: str(proposalRes.data?.proposal_number),
    clientId: isAdmin ? project.client_id ?? null : null,
  }
  return { view, client: c ? { name: String(c.full_name || c.business_name || 'Client'), business: c.full_name && c.business_name ? String(c.business_name) : null } : null }
}

export function invoicePdfInput(view: InvoiceView, client: { name: string; business: string | null } | null): InvoicePdfInput {
  return {
    number: view.number,
    statusLabel: view.statusLabel,
    billTo: { name: client?.name ?? 'Client', business: client?.business ?? null },
    project: { name: view.project.name, reference: view.project.reference },
    proposalNumber: view.proposalNumber,
    issueDate: view.issueDate,
    dueDate: view.dueDate,
    currency: view.currency,
    lines: view.lines,
    subtotal: view.subtotal,
    discount: view.discount,
    tax: view.tax,
    total: view.total,
    paid: view.paid,
    balance: view.balance,
    paymentInstructions: view.paymentInstructions,
    notes: view.notes,
    payments: view.payments.map((p) => ({ paid_at: p.paid_at, amount: p.amount, method: p.method, reference: p.reference })),
  }
}
