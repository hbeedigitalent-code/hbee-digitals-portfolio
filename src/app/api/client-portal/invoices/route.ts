// src/app/api/client-portal/invoices/route.ts
//
// GET — the CALLER's own invoices, as an allow-list (replaces the browser-side
// project_invoices.select('*') under RLS). project_invoices has no client_id: ownership is
// project_invoices.project_id -> projects.id -> projects.client_id, so invoices are fetched ONLY
// through project ids this client already owns, and no owned projects means no invoice query.
//
// Read-only. There is no payment processing here. The one stored `payment_link` is handed out only
// when it is a plain https URL (never javascript:, data: or http:), and nothing is derived from it.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { safeHttpsUrl } from '@/lib/client-portal/support-display'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const user = portal.user


    const { data: projectRows, error: projectError } = await adminClient
      .from('projects')
      .select('id, project_name, project_id')
      .eq('client_id', portal.client.id)
      .limit(200)

    if (projectError) {
      console.error('[client-portal/invoices] projects query failed')
      return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
    }

    const projects = new Map<string, string>()
    for (const p of (projectRows || []) as any[]) {
      projects.set(p.id, (p.project_name || '').trim() || (p.project_id || '').trim() || 'Untitled project')
    }

    let invoices: any[] = []
    if (projects.size > 0) {
      const { data, error } = await adminClient
        .from('project_invoices')
        .select('id, invoice_number, amount, currency, status, due_date, payment_link, created_at, project_id')
        .in('project_id', [...projects.keys()])
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) {
        console.error('[client-portal/invoices] invoices query failed')
        return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
      }
      invoices = data || []
    }

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        number: i.invoice_number || null,
        amount: i.amount ?? null,
        currency: i.currency || null,
        status: i.status || null,
        dueDate: i.due_date || null,
        issuedAt: i.created_at || null,
        projectName: i.project_id ? projects.get(i.project_id) ?? null : null,
        paymentLink: safeHttpsUrl(i.payment_link),
      })),
    })
  } catch (error) {
    console.error('❌ Client invoices list error:', error)
    return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
  }
}
