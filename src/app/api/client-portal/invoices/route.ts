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
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { safeHttpsUrl } from '@/lib/client-portal/support-display'

export const dynamic = 'force-dynamic'

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function GET() {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error('[client-portal/invoices] client lookup failed')
      return NextResponse.json({ error: 'Failed to load your invoices' }, { status: 500 })
    }
    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (clientRows.length > 1) {
      console.error(`[client-portal/invoices] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const { data: projectRows, error: projectError } = await adminClient
      .from('projects')
      .select('id, project_name, project_id')
      .eq('client_id', clientRows[0].id)
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
