// src/app/api/client-portal/proposals/route.ts
//
// GET — every proposal that has actually been DELIVERED to the CALLER's own client account.
//
// Ownership: proposals.client_id = <clients.id resolved from the session>, and the status is one the client may see. A draft is
// never listed, a proposal with a NULL client_id belongs to no portal account, and a caller with no usable account gets the
// resolver's own answer. S6.4 adds the currency, version and total (database-computed numeric, passed on as text) and lists
// declined / legacy-rejected proposals. `notes` (the Admin's internal notes) is never selected.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { CLIENT_VISIBLE_PROPOSAL_STATUSES } from '@/lib/commerce/documents'
import { normalizeProposalStatus } from '@/lib/proposal-status'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 200

export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response

    const { data, error } = await portal.db
      .from('proposals')
      .select('id, proposal_number, title, status, currency, total, version, pricing, expires_at, sent_at, accepted_at, created_at, converted_to_project_id, merchant:merchants(business_name)')
      .eq('client_id', portal.client.id)
      .in('status', CLIENT_VISIBLE_PROPOSAL_STATUSES)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(MAX_ROWS)
    if (error) {
      console.error('[client-portal/proposals] query failed')
      return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 })
    }

    return NextResponse.json({
      proposals: (data || []).map((p: any) => ({
        id: p.id,
        proposal_number: p.proposal_number,
        title: p.title,
        // the legacy spellings are normalised for the page (rejected -> declined, converted -> approved)
        status: normalizeProposalStatus(p.status) === 'unknown' ? p.status : normalizeProposalStatus(p.status),
        currency: p.currency ?? p.pricing?.currency ?? 'USD',
        total: p.total ?? p.pricing?.total ?? null,
        // legacy shape kept so older page code keeps working
        pricing: p.pricing ?? null,
        version: p.version ?? 1,
        expires_at: p.expires_at,
        sent_at: p.sent_at,
        accepted_at: p.accepted_at,
        created_at: p.created_at,
        converted: !!p.converted_to_project_id && normalizeProposalStatus(p.status) === 'approved',
        merchant: p.merchant ?? null,
      })),
    })
  } catch (error) {
    console.error('❌ Client proposals list error:', error)
    return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 })
  }
}
