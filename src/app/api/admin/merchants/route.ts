// src/app/api/admin/merchants/route.ts
//
// GET — the merchant lists for src/app/admin/merchants/page.tsx, in one of two FIXED views (an enum, never a
// column list or table name from the caller):
//
//   view=accounts   (default, unchanged) the merchant_accounts rows: one per SIGN-UP LOGIN. merchant_accounts.id is
//                   the auth user id. Replaces the page's old direct query, which ran as the caller's
//                   `authenticated` role outside the admin 2FA check. The page derives its total/pending/active
//                   tiles from the same rows, so the counts are computed here and returned alongside.
//
//   view=businesses (Phase A2 follow-up) the `merchants` rows: one per BUSINESS that submitted a Growth Review.
//                   This is the record the whole Growth Review workflow hangs off, and the one /admin/merchants/[id]
//                   shows. Each row also carries three read-only relationship facts, all from stored identifiers:
//                     linked_clients  how many clients rows have clients.merchant_id = this merchant
//                     reviews         growth_reviews counts for this merchant_id
//                     lifecycle       merchant_status.status for this merchant_id
//                   A relationship read that fails is returned as null ("could not be determined"), never as 0.
//
// Neither view writes anything, merges anything or matches on name or email. See
// docs/admin-merchant-architecture.md for the table relationships.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

// The confirmed merchant_accounts columns, enumerated rather than `*` so a
// column added to the table later is not published by accident.
//
// `phone` and `website` used to appear here. Those are columns of the separate
// `merchants` table (the assessment record), NOT of merchant_accounts, which
// names the same ideas `whatsapp` and `website_url`. PostgREST rejected the
// whole SELECT with 42703, so the list endpoint returned a generic 500 while
// every other converted page worked.
const MERCHANT_ACCOUNT_COLUMNS =
  'id, business_name, contact_name, email, whatsapp, website_url, country, ' +
  'industry, status, email_verified, created_at, updated_at'

const BUSINESS_COLUMNS = 'id, business_name, contact_name, email, website, industry, country, created_at'

export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const view = new URL(request.url).searchParams.get('view') || 'accounts'
    if (view !== 'accounts' && view !== 'businesses') {
      return NextResponse.json({ error: 'Unsupported view' }, { status: 400 })
    }

    if (view === 'businesses') {
      const { data: merchants, error } = await db
        .from('merchants')
        .select(BUSINESS_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) return queryFailure('merchant business list', error)

      // Related reads are joined here by stored ids rather than through PostgREST embeds, so the list does not
      // depend on declared foreign keys. A failure of one leaves that field null.
      const [statusRes, clientsRes, reviewsRes] = await Promise.all([
        db.from('merchant_status').select('merchant_id, status').limit(5000),
        db.from('clients').select('merchant_id').not('merchant_id', 'is', null).limit(5000),
        db.from('growth_reviews').select('merchant_id, status').limit(5000),
      ])
      if (statusRes.error) console.error('[admin-api] merchant list: status read failed')
      if (clientsRes.error) console.error('[admin-api] merchant list: clients read failed')
      if (reviewsRes.error) console.error('[admin-api] merchant list: reviews read failed')

      const statusBy = new Map<string, string>()
      for (const row of statusRes.data || []) statusBy.set(row.merchant_id, row.status)
      const clientsBy = new Map<string, number>()
      for (const row of clientsRes.data || []) clientsBy.set(row.merchant_id, (clientsBy.get(row.merchant_id) || 0) + 1)
      const reviewsBy = new Map<string, { total: number; needs_review: number }>()
      for (const row of reviewsRes.data || []) {
        const entry = reviewsBy.get(row.merchant_id) || { total: 0, needs_review: 0 }
        entry.total += 1
        if (row.status === 'pending' || row.status === 'in_progress') entry.needs_review += 1
        reviewsBy.set(row.merchant_id, entry)
      }

      const rows = (merchants || []).map((m: any) => ({
        ...m,
        lifecycle: statusRes.error ? null : statusBy.get(m.id) ?? null,
        linked_clients: clientsRes.error ? null : clientsBy.get(m.id) ?? 0,
        reviews: reviewsRes.error ? null : reviewsBy.get(m.id) ?? { total: 0, needs_review: 0 },
      }))

      return NextResponse.json({ businesses: rows })
    }

    const { data, error } = await db
      .from('merchant_accounts')
      .select(MERCHANT_ACCOUNT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return queryFailure('merchant account list', error)

    const rows = data || []

    // Phase A2 follow-up: for each sign-up login, the stored chain merchant_accounts.id = clients.user_id →
    // clients.merchant_id. `portal_account` / `merchant_id` are null when the chain cannot be read (distinct from
    // "no portal account" / "not linked"). Nothing is matched on email or name.
    const { data: clientRows, error: clientError } = await db
      .from('clients')
      .select('id, user_id, merchant_id')
      .not('user_id', 'is', null)
      .limit(5000)
    if (clientError) console.error('[admin-api] merchant account list: clients read failed')
    const clientByUser = new Map<string, { id: string; merchant_id: string | null }>()
    for (const c of clientRows || []) if (!clientByUser.has(c.user_id)) clientByUser.set(c.user_id, c)

    const accounts = rows.map((account: any) => {
      const client = clientByUser.get(account.id) || null
      return {
        ...account,
        portal_account: clientError ? null : client ? { id: client.id } : false,
        merchant_id: clientError ? null : client?.merchant_id ?? null,
      }
    })

    return NextResponse.json({
      merchants: accounts,
      stats: {
        total: rows.length,
        pending: rows.filter((m: any) => m.status === 'pending').length,
        active: rows.filter((m: any) => m.status === 'active').length,
      },
    })
  } catch (error) {
    console.error('[admin-api] merchant account list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
