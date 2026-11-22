// src/lib/commerce/summaries.ts
//
// SERVER-SIDE, READ-ONLY. Compact views of a client's invoices and proposals for the Overview, the project page and the Admin
// summaries. It reads; it never writes, issues, voids or records anything, and it never changes a status.
//
// ONE rule for money: paid and balance come from the immutable payment ledger with exact integer arithmetic (money.ts), the same
// way /api/client-portal/invoices computes them. "Overdue" is DERIVED from the due date (invoice-status.ts), never stored.
// What a CLIENT may see is decided by the caller, through the `statuses` filter (CLIENT_VISIBLE_INVOICE_STATUSES); Admin passes
// none and sees every status, drafts and voided included.

import { displayInvoiceStatus, INVOICE_STATUS_LABELS } from './invoice-status'
import { minorToString, sumMinor, toMinor } from './money'
import { assessProjectOverlap } from './project-overlap'

export interface InvoiceSummary {
  id: string
  number: string | null
  /** The STORED status (draft, issued, partially_paid, paid, void). */
  status: string
  /** The status to show: the stored one, or the derived 'overdue'. */
  displayStatus: string
  statusLabel: string
  currency: string
  total: string
  paid: string
  balance: string
  issueDate: string | null
  dueDate: string | null
  projectId: string | null
  createdAt: string | null
}

export interface ProposalSummary {
  id: string
  number: string | null
  title: string
  status: string
  currency: string | null
  total: string | null
  approvedVersion: number | null
  projectId: string | null
  createdAt: string | null
}

const dayOf = (v: unknown): string | null => (typeof v === 'string' && v ? v.slice(0, 10) : null)

/** One invoice row plus its ledger amounts, as a summary. Pure. */
export function summarizeInvoice(row: any, payments: Array<bigint | null | undefined>): InvoiceSummary {
  const total = toMinor(row?.amount) ?? 0n
  const paid = sumMinor(payments)
  const shown = displayInvoiceStatus({ status: row?.status, due_date: row?.due_date })
  return {
    id: String(row.id),
    number: row.invoice_number ? String(row.invoice_number) : null,
    status: String(row.status ?? ''),
    displayStatus: shown,
    statusLabel: INVOICE_STATUS_LABELS[shown],
    currency: String(row.currency || 'USD'),
    total: minorToString(total),
    paid: minorToString(paid),
    balance: minorToString(total - paid),
    issueDate: dayOf(row.issue_date),
    dueDate: dayOf(row.due_date),
    projectId: row.project_id ? String(row.project_id) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  }
}

/**
 * Does this invoice ask something of the client? Issued or partially paid, with a balance still to pay. Draft, paid and void
 * never do, and an overdue invoice is still an issued / partially paid one (overdue is a derived label, not a status).
 */
export function isActionableInvoice(s: Pick<InvoiceSummary, 'status' | 'balance'>): boolean {
  if (s.status !== 'issued' && s.status !== 'partially_paid') return false
  return (toMinor(s.balance) ?? 0n) > 0n
}

/**
 * The invoices of the given projects, with paid and balance. `statuses` limits which stored statuses are read (the client
 * routes pass CLIENT_VISIBLE_INVOICE_STATUSES; omit it for Admin). No projects means no query. A failed read is `ok: false`,
 * never an empty list, so a caller can say "unavailable" instead of "nothing owed".
 */
export async function loadInvoiceSummaries(
  db: any,
  projectIds: string[],
  opts: { statuses?: readonly string[]; limit?: number } = {},
): Promise<{ ok: true; invoices: InvoiceSummary[] } | { ok: false }> {
  if (projectIds.length === 0) return { ok: true, invoices: [] }
  let query = db
    .from('project_invoices')
    .select('id, invoice_number, amount, currency, status, issue_date, due_date, issued_at, created_at, project_id')
    .in('project_id', projectIds)
  if (opts.statuses) query = query.in('status', [...opts.statuses])
  const { data, error } = await query.order('created_at', { ascending: false }).limit(opts.limit ?? 100)
  if (error) return { ok: false }
  const rows: any[] = data || []
  const paymentsBy = new Map<string, bigint[]>()
  if (rows.length > 0) {
    const { data: pays, error: payError } = await db.from('invoice_payments').select('invoice_id, amount').in('invoice_id', rows.map((r) => r.id))
    if (payError) return { ok: false }
    for (const p of (pays || []) as any[]) paymentsBy.set(p.invoice_id, [...(paymentsBy.get(p.invoice_id) || []), toMinor(p.amount) ?? 0n])
  }
  return { ok: true, invoices: rows.map((r) => summarizeInvoice(r, paymentsBy.get(r.id) || [])) }
}

/**
 * The one invoice a project page should lead with: an invoice that still needs paying (newest first), else the newest. Pure.
 * `others` is how many more there are, so the page can link to the full list instead of listing them.
 */
export function pickProjectInvoice(invoices: InvoiceSummary[]): { invoice: InvoiceSummary | null; others: number } {
  if (invoices.length === 0) return { invoice: null, others: 0 }
  const newest = (a: InvoiceSummary, b: InvoiceSummary) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  const sorted = [...invoices].sort(newest)
  const invoice = sorted.find(isActionableInvoice) ?? sorted[0]
  return { invoice, others: invoices.length - 1 }
}

/** The proposal relevant to a project: the approved one first, then the newest. Pure. */
export function pickProjectProposal<T extends { status: string; createdAt?: string | null }>(proposals: T[]): T | null {
  if (proposals.length === 0) return null
  const sorted = [...proposals].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return sorted.find((p) => p.status === 'approved') ?? sorted[0]
}

export function summarizeProposal(row: any): ProposalSummary {
  return {
    id: String(row.id),
    number: row.proposal_number ? String(row.proposal_number) : null,
    title: String(row.title || '').trim() || 'Proposal',
    status: String(row.status ?? ''),
    currency: row.currency ? String(row.currency) : null,
    total: row.total === null || row.total === undefined ? null : minorToString(toMinor(row.total) ?? 0n),
    approvedVersion: Number.isFinite(Number(row.approved_version)) && row.approved_version !== null ? Number(row.approved_version) : null,
    projectId: row.converted_to_project_id ? String(row.converted_to_project_id) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  }
}

// ── Admin summaries ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Admin sees EVERYTHING (drafts and voided included, each with its status). All read-only and compact: counts, the latest few
// and the money still owing per currency. A section whose read failed is named in `unavailable`, never shown as empty.

export interface AdminProjectSummary {
  id: string
  reference: string | null
  name: string
  status: string
  createdAt: string | null
}

export interface OutstandingBalance {
  currency: string
  balance: string
  invoices: number
}

const LATEST = 5

/** What is still owing, per currency: issued / partially paid invoices only (never draft, paid or void). Pure. */
export function outstandingByCurrency(invoices: InvoiceSummary[]): OutstandingBalance[] {
  const by = new Map<string, { minor: bigint; n: number }>()
  for (const i of invoices.filter(isActionableInvoice)) {
    const cur = by.get(i.currency) ?? { minor: 0n, n: 0 }
    by.set(i.currency, { minor: cur.minor + (toMinor(i.balance) ?? 0n), n: cur.n + 1 })
  }
  return [...by.entries()].map(([currency, v]) => ({ currency, balance: minorToString(v.minor), invoices: v.n })).sort((a, b) => a.currency.localeCompare(b.currency))
}

export function summarizeAdminProject(row: any): AdminProjectSummary {
  return {
    id: String(row.id),
    reference: row.project_id ? String(row.project_id) : null,
    name: String(row.project_name || row.title || '').trim() || 'Untitled project',
    status: String(row.status ?? ''),
    createdAt: row.created_at ? String(row.created_at) : null,
  }
}

const PROPOSAL_SUMMARY_COLUMNS = 'id, proposal_number, title, status, currency, total, approved_version, converted_to_project_id, created_at'

/** Proposals, projects and invoices of ONE client for the Admin client page. */
export async function loadClientCommerce(db: any, clientId: string) {
  const unavailable: string[] = []

  const projectsRes = await db.from('projects').select('id, project_id, project_name, title, status, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(100)
  const projectRows: any[] = projectsRes.error ? [] : projectsRes.data || []
  if (projectsRes.error) unavailable.push('projects')

  const proposalsRes = await db.from('proposals').select(PROPOSAL_SUMMARY_COLUMNS).eq('client_id', clientId).order('created_at', { ascending: false }).limit(100)
  const proposalRows: any[] = proposalsRes.error ? [] : proposalsRes.data || []
  if (proposalsRes.error) unavailable.push('proposals')

  const invoiceRead = await loadInvoiceSummaries(db, projectRows.map((p) => String(p.id)), { limit: 200 })
  if (!invoiceRead.ok) unavailable.push('invoices')
  const invoices = invoiceRead.ok ? invoiceRead.invoices : []

  const projects = projectRows.map(summarizeAdminProject)
  const proposals = proposalRows.map(summarizeProposal)
  const names = new Map(projects.map((p) => [p.id, p.name]))
  return {
    projects: { total: projects.length, latest: projects.slice(0, LATEST) },
    // What the proposal editor tells Admin about projects that already exist for this client (project-overlap.ts).
    projectOverlap: assessProjectOverlap(projects),
    proposals: {
      total: proposals.length,
      awaitingClient: proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      latest: proposals.slice(0, LATEST),
    },
    invoices: {
      total: invoices.length,
      outstanding: outstandingByCurrency(invoices),
      latest: invoices.slice(0, LATEST).map((i) => ({ ...i, projectName: i.projectId ? names.get(i.projectId) ?? null : null })),
    },
    unavailable,
  }
}

/** The proposal(s) and invoice(s) of ONE project for the Admin project page. */
export async function loadProjectCommerce(db: any, projectId: string) {
  const unavailable: string[] = []
  const proposalsRes = await db.from('proposals').select(PROPOSAL_SUMMARY_COLUMNS).eq('converted_to_project_id', projectId).order('created_at', { ascending: false }).limit(10)
  if (proposalsRes.error) unavailable.push('proposals')
  const proposals = (proposalsRes.error ? [] : proposalsRes.data || []).map(summarizeProposal)

  const invoiceRead = await loadInvoiceSummaries(db, [projectId], { limit: 50 })
  if (!invoiceRead.ok) unavailable.push('invoices')
  const invoices = invoiceRead.ok ? invoiceRead.invoices : []

  return { proposals, invoices, outstanding: outstandingByCurrency(invoices), unavailable }
}
