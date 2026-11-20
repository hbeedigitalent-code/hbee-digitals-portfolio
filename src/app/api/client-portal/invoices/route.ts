// src/app/api/client-portal/invoices/route.ts
//
// GET — the CALLER's own invoices, as an allow-list. project_invoices has no client_id: ownership is
// project_invoices.project_id -> projects.id -> projects.client_id, so invoices are fetched ONLY through project ids this client
// already owns, and no owned projects means no invoice query. Only DELIVERED invoices are listed (issued, partially paid, paid,
// void): a draft is invisible to the client. Paid and balance come from the immutable payment ledger with exact integer
// arithmetic; "overdue" is derived from the due date and never stored. Read-only: there is no payment processing here.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { CLIENT_VISIBLE_INVOICE_STATUSES } from '@/lib/commerce/documents'
import { displayInvoiceStatus, INVOICE_STATUS_LABELS } from '@/lib/commerce/invoice-status'
import { minorToString, sumMinor, toMinor } from '@/lib/commerce/money'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const db = portal.db

    const { data: projectRows, error: projectError } = await db.from('projects').select('id, project_name, project_id').eq('client_id', portal.client.id).limit(200)
    if (projectError) {
      console.error('[client-portal/invoices] projects query failed')
      return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
    }
    const projects = new Map<string, string>()
    for (const p of (projectRows || []) as any[]) projects.set(p.id, (p.project_name || '').trim() || (p.project_id || '').trim() || 'Untitled project')

    let invoices: any[] = []
    let paymentsBy = new Map<string, bigint[]>()
    if (projects.size > 0) {
      const { data, error } = await db
        .from('project_invoices')
        .select('id, invoice_number, amount, currency, status, issue_date, due_date, issued_at, created_at, project_id')
        .in('project_id', [...projects.keys()])
        .in('status', CLIENT_VISIBLE_INVOICE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) {
        console.error('[client-portal/invoices] invoices query failed')
        return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
      }
      invoices = data || []
      const ids = invoices.map((i) => i.id)
      if (ids.length) {
        const { data: pays } = await db.from('invoice_payments').select('invoice_id, amount').in('invoice_id', ids)
        for (const p of (pays || []) as any[]) paymentsBy.set(p.invoice_id, [...(paymentsBy.get(p.invoice_id) || []), toMinor(p.amount) ?? 0n])
      }
    }

    return NextResponse.json({
      invoices: invoices.map((i) => {
        const total = toMinor(i.amount) ?? 0n
        const paid = sumMinor(paymentsBy.get(i.id) || [])
        const shown = displayInvoiceStatus({ status: i.status, due_date: i.due_date })
        return {
          id: i.id,
          number: i.invoice_number || null,
          amount: minorToString(total),
          currency: i.currency || null,
          status: shown,
          statusLabel: INVOICE_STATUS_LABELS[shown],
          paid: minorToString(paid),
          balance: minorToString(total - paid),
          issueDate: i.issue_date || null,
          dueDate: i.due_date ? String(i.due_date).slice(0, 10) : null,
          issuedAt: i.issued_at || i.created_at || null,
          projectName: i.project_id ? projects.get(i.project_id) ?? null : null,
        }
      }),
    })
  } catch (error) {
    console.error('❌ Client invoices list error:', error)
    return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
  }
}
