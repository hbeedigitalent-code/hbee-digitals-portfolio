// src/app/api/admin/proposals/[id]/route.ts
//
// GET   — the Admin's full commercial view of one proposal: the version being shown, the live draft lines (for the editor),
//         every sent version, the client's responses (change requests / decline, with their text — Admin only), the linked client,
//         project and invoices. Internal notes are included here because only an Admin can call this route.
// PATCH — save the DRAFT: the allow-listed fields of draft-input.ts, through save_proposal_draft (one transaction; money computed
//         in SQL). Refused by the database function once a proposal has been sent, and by the guard trigger if anything else tried.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { resolveClientIdByMerchantId } from '@/lib/notifications/createNotification'
import { parseProposalDraft } from '@/lib/commerce/draft-input'
import { callRpc, refusal } from '@/lib/commerce/rpc'
import { loadProposalView } from '@/lib/commerce/documents'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    // The row is read FIRST and on its own so that "the read failed" (500) can never be mistaken for "there is no such proposal"
    // (404): loadProposalView below reports both as null.
    const { data: record, error: recordError } = await db.from('proposals').select('*').eq('id', id).maybeSingle()
    if (recordError) return queryFailure('proposal read', recordError)
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let merchant: Record<string, any> | null = null
    if (record.merchant_id) {
      const { data: m, error: merchantError } = await db.from('merchants').select('id, business_name, contact_name, email, website').eq('id', record.merchant_id).maybeSingle()
      if (merchantError) return queryFailure('proposal merchant read', merchantError)
      merchant = m ?? null
    }
    let linkedClient: Record<string, any> | null = null
    if (record.client_id) {
      const { data: c, error: clientError } = await db.from('clients').select('id, business_name, full_name, email').eq('id', record.client_id).maybeSingle()
      if (clientError) return queryFailure('proposal client read', clientError)
      linkedClient = c ?? null
    }

    const loaded = await loadProposalView(db, id, { admin: true })
    // the row exists, so a null view is a failed read (an admin always gets at least a draft preview), never a missing proposal
    if (!loaded) return queryFailure('proposal view read', null)
    const rowRes = { data: record }
    const [linesRes, versionsRes, responsesRes, invoicesRes] = await Promise.all([
      db.from('proposal_line_items').select('id, title, description, quantity, unit_price, amount, sort_order').eq('proposal_id', id).order('sort_order', { ascending: true }),
      db.from('proposal_versions').select('id, version_number, total, currency, sent_at, created_at').eq('proposal_id', id).order('version_number', { ascending: true }),
      db.from('proposal_responses').select('id, version_number, response_type, message, created_at, resolved_at, resolved_in_version').eq('proposal_id', id).order('created_at', { ascending: true }),
      db.from('project_invoices').select('id, invoice_number, status, amount, currency').eq('proposal_id', id),
    ])
    if (linesRes.error || versionsRes.error) return queryFailure('proposal commercial read', linesRes.error || versionsRes.error)
    return NextResponse.json({
      proposal: loaded.view,
      client: loaded.client,
      // the stored proposals row (Admin only) and the linked merchant / client records the detail page renders
      record,
      merchant,
      linkedClient,
      internal: { notes: rowRes.data?.notes ?? null, revisionNote: rowRes.data?.revision_note ?? null, merchantId: rowRes.data?.merchant_id ?? null, clientId: rowRes.data?.client_id ?? null },
      // the LIVE fields the editor works on (for a proposal under revision these differ from the snapshot the client last saw)
      draft: rowRes.data
        ? {
            status: rowRes.data.status, title: rowRes.data.title, currency: rowRes.data.currency, summary: rowRes.data.summary, scope: rowRes.data.scope,
            deliverables: rowRes.data.deliverables, timeline: rowRes.data.timeline, terms: rowRes.data.terms, discount_amount: rowRes.data.discount_amount,
            expires_at: rowRes.data.expires_at, issue_date: rowRes.data.issue_date, payment_terms: rowRes.data.pricing?.payment_terms ?? '',
          }
        : null,
      draftLines: linesRes.data || [],
      versions: versionsRes.data || [],
      responses: responsesRes.data || [],
      invoices: invoicesRes.data || [],
    })
  } catch (error) {
    return queryFailure('proposal commercial read', error)
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const parsed = parseProposalDraft(await request.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 })

    // if the merchant has since been linked to a client account, pick that up; the browser never names a client
    const { data: row } = await db.from('proposals').select('merchant_id, client_id').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const clientId = row.client_id ?? (row.merchant_id ? await resolveClientIdByMerchantId(row.merchant_id) : null)

    const result = await callRpc(db, 'save_proposal_draft', { p_proposal_id: id, p_merchant_id: null, p_client_id: clientId, p_proposal_number: null, p_actor: userId, p_data: parsed.data })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['saved'])
    if (refused) return refused
    const o = result.outcome
    return NextResponse.json({ success: true, proposal: { id, version: o.version, subtotal: o.subtotal, discount: o.discount_amount, total: o.total, currency: o.currency, lineCount: o.line_count } })
  } catch (error) {
    return queryFailure('proposal save', error)
  }
}
