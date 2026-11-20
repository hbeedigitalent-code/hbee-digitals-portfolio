// src/app/api/admin/invoices/route.ts
//
// GET  — the Admin invoice list, with client / project names, the payment-ledger total and balance, and the DERIVED overdue state.
//        ?status=draft|issued|partially_paid|paid|void|overdue filters (overdue is computed, never stored).
// POST — create a DRAFT invoice: from an approved proposal ({project_id, proposal_id, due_date?}) or for a client project
//        ({project_id, currency, due_date?}). The database function does the work: it takes the number from the transactional
//        counter, copies the APPROVED VERSION's line items (not the live ones), refuses a portfolio project, a non-approved
//        proposal, a project that is not the proposal's, and a second live invoice for the same proposal. Nothing about
//        totals, number, status or client is read from the body.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpc, refusal } from '@/lib/commerce/rpc'
import { isCurrency, minorToString, sumMinor, toMinor } from '@/lib/commerce/money'
import { INVOICE_STATUSES, displayInvoiceStatus, INVOICE_STATUS_LABELS } from '@/lib/commerce/invoice-status'

export const dynamic = 'force-dynamic'

const LIMIT = 300
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth
  try {
    const wanted = new URL(request.url).searchParams.get('status') || ''
    const { data: rows, error } = await db
      .from('project_invoices')
      .select('id, invoice_number, project_id, proposal_id, amount, currency, status, due_date, issue_date, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
    if (error) return queryFailure('invoice list', error)

    const ids = (rows || []).map((r: any) => r.id)
    const projectIds = Array.from(new Set((rows || []).map((r: any) => r.project_id).filter(Boolean)))
    const [paymentsRes, projectsRes] = await Promise.all([
      ids.length ? db.from('invoice_payments').select('invoice_id, amount').in('invoice_id', ids) : Promise.resolve({ data: [] }),
      projectIds.length ? db.from('projects').select('id, project_name, project_id, client_id').in('id', projectIds) : Promise.resolve({ data: [] }),
    ])
    const clientIds = Array.from(new Set((projectsRes.data || []).map((p: any) => p.client_id).filter(Boolean)))
    const clientsRes = clientIds.length ? await db.from('clients').select('id, full_name, business_name').in('id', clientIds) : { data: [] }

    const paidBy = new Map<string, bigint[]>()
    for (const p of (paymentsRes.data || []) as any[]) paidBy.set(p.invoice_id, [...(paidBy.get(p.invoice_id) || []), toMinor(p.amount) ?? 0n])
    const projects = new Map<string, any>((projectsRes.data || []).map((p: any) => [p.id, p]))
    const clients = new Map<string, string>((clientsRes.data || []).map((c: any) => [c.id, String(c.business_name || c.full_name || 'Client')]))

    let list = (rows || []).map((r: any) => {
      const total = toMinor(r.amount) ?? 0n
      const paid = sumMinor(paidBy.get(r.id) || [])
      const shown = displayInvoiceStatus({ status: r.status, due_date: r.due_date })
      const project = projects.get(r.project_id)
      return {
        id: r.id, number: r.invoice_number, status: r.status, displayStatus: shown, statusLabel: INVOICE_STATUS_LABELS[shown],
        currency: r.currency, total: minorToString(total), paid: minorToString(paid), balance: minorToString(total - paid),
        dueDate: r.due_date ? String(r.due_date).slice(0, 10) : null, issueDate: r.issue_date ?? null, createdAt: r.created_at,
        projectId: r.project_id, projectName: project ? String(project.project_name || project.project_id || 'Project') : null,
        clientId: project?.client_id ?? null, clientName: project?.client_id ? clients.get(project.client_id) ?? null : null, proposalId: r.proposal_id ?? null,
      }
    })
    if (wanted === 'overdue') list = list.filter((r: any) => r.displayStatus === 'overdue')
    else if ((INVOICE_STATUSES as readonly string[]).includes(wanted)) list = list.filter((r: any) => r.status === wanted)
    return NextResponse.json({ invoices: list, truncated: (rows || []).length >= LIMIT })
  } catch (error) {
    return queryFailure('invoice list', error)
  }
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json().catch(() => null)
    const projectId = typeof body?.project_id === 'string' ? body.project_id.trim() : ''
    const proposalId = typeof body?.proposal_id === 'string' && body.proposal_id.trim() ? body.proposal_id.trim() : null
    if (!ADMIN_UUID_RE.test(projectId)) return NextResponse.json({ error: 'Choose a client project.', field: 'project_id' }, { status: 400 })
    if (proposalId && !ADMIN_UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Invalid proposal.', field: 'proposal_id' }, { status: 400 })
    if (!proposalId && !isCurrency(body?.currency)) return NextResponse.json({ error: 'Choose USD, NGN, GBP or EUR.', field: 'currency' }, { status: 400 })
    const due = body?.due_date === undefined || body?.due_date === null || body?.due_date === '' ? null : String(body.due_date)
    if (due !== null && (!DATE_RE.test(due) || Number.isNaN(new Date(due).getTime()))) return NextResponse.json({ error: 'Enter a valid due date.', field: 'due_date' }, { status: 400 })

    const result = await callRpc(auth.db, 'create_invoice', { p_project_id: projectId, p_proposal_id: proposalId, p_currency: proposalId ? null : body.currency, p_due_date: due, p_actor: auth.userId })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['created'])
    if (refused) return refused
    return NextResponse.json({ success: true, invoice: { id: result.outcome.invoice_id, number: result.outcome.invoice_number } }, { status: 201 })
  } catch (error) {
    return queryFailure('invoice create', error)
  }
}
