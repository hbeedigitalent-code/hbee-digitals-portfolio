// src/app/api/admin/proposals/route.ts
//
// POST — create ONE proposal DRAFT on behalf of an authenticated, 2FA-verified, active admin (requireActiveAdmin).
//
// S6.4: the commercial content is saved by the database function save_proposal_draft in ONE transaction: the proposal row, its
// line items, and the subtotal / discount / total, computed in SQL from the line items (numeric, never JavaScript floating
// point). This route therefore never receives or trusts a total, a status, a version, a client id or a created_by: it parses
// an allow-list (draft-input.ts), resolves the merchant and the owning client SERVER-SIDE, and generates the proposal number.
//
// The proposal number keeps its existing PROP-YYYYMMDD-XXXXXX form (existing numbers are unchanged); a unique-index collision
// is retried with a fresh number, and nothing is kept from the failed attempt (the function is one transaction).
//
// No client notification is created here: a draft is not visible to anyone. Sending is a separate, explicit action.

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { resolveClientIdByMerchantId } from '@/lib/notifications/createNotification'
import { parseProposalDraft } from '@/lib/commerce/draft-input'
import { callRpc, refusal } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

const MAX_NUMBER_ATTEMPTS = 5

function buildProposalNumber(): string {
  const now = new Date()
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `PROP-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const merchantId = typeof body.merchant_id === 'string' ? body.merchant_id.trim() : ''
    const growthProfileId = typeof body.growth_profile_id === 'string' ? body.growth_profile_id.trim() : ''
    if (!ADMIN_UUID_RE.test(merchantId)) return NextResponse.json({ error: 'A valid merchant is required' }, { status: 400 })
    if (growthProfileId && !ADMIN_UUID_RE.test(growthProfileId)) return NextResponse.json({ error: 'A valid growth profile is required' }, { status: 400 })

    const parsed = parseProposalDraft(body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 })
    if (typeof parsed.data.title !== 'string' || !String(parsed.data.title).trim()) return NextResponse.json({ error: 'A proposal title is required', field: 'title' }, { status: 400 })

    const { data: merchant } = await db.from('merchants').select('id').eq('id', merchantId).maybeSingle()
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })

    // an optional growth profile must exist, be active and belong to THIS merchant: the browser's pairing is never trusted
    if (growthProfileId) {
      const { data: profile } = await db.from('growth_profiles').select('id, merchant_id, is_active').eq('id', growthProfileId).maybeSingle()
      if (!profile) return NextResponse.json({ error: 'Growth profile not found' }, { status: 404 })
      if (!profile.is_active) return NextResponse.json({ error: 'The selected growth profile is not active' }, { status: 400 })
      if (profile.merchant_id !== merchantId) return NextResponse.json({ error: 'The selected growth profile does not belong to the selected merchant' }, { status: 400 })
    }

    // the owning client is derived from the merchant, never from the request; an unlinked merchant leaves it NULL (a draft can
    // exist without one, but cannot be SENT without one)
    const clientId = await resolveClientIdByMerchantId(merchantId)

    let outcome: Record<string, any> | null = null
    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      const result = await callRpc(db, 'save_proposal_draft', {
        p_proposal_id: null,
        p_merchant_id: merchantId,
        p_client_id: clientId,
        p_proposal_number: buildProposalNumber(),
        p_actor: userId,
        p_data: parsed.data,
      })
      if (!result.ok) {
        if (result.unique) continue
        return result.response
      }
      outcome = result.outcome
      break
    }
    if (!outcome) return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
    const refused = refusal(outcome as any, ['saved'])
    if (refused) return refused

    const proposalId = String(outcome.proposal_id)
    if (growthProfileId && (await hasGrowthProfileColumn(db))) {
      const { error } = await db.from('proposals').update({ growth_profile_id: growthProfileId }).eq('id', proposalId).eq('status', 'draft')
      if (error) console.error('⚠️ proposal created but its growth profile link was not saved')
    }

    // merchant lifecycle: best effort, exactly as before — a failure never undoes the proposal
    const now = new Date().toISOString()
    const { error: statusError } = await db
      .from('merchant_status')
      .update({ status: 'proposal_ready', current_stage: 'proposal_ready', last_activity: now, updated_at: now })
      .eq('merchant_id', merchantId)
    if (statusError) console.error('⚠️ Proposal created but merchant status update failed')

    return NextResponse.json({ success: true, proposal: { id: proposalId, proposal_number: outcome.proposal_number, total: outcome.total, currency: outcome.currency } })
  } catch (error) {
    console.error('❌ Proposal creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// proposals.growth_profile_id is optional and not referenced anywhere else: probe once per process, include only when present.
let growthProfileColumn: boolean | null = null
async function hasGrowthProfileColumn(db: any): Promise<boolean> {
  if (growthProfileColumn !== null) return growthProfileColumn
  const { error } = await db.from('proposals').select('growth_profile_id').limit(1)
  growthProfileColumn = !error
  return growthProfileColumn
}
