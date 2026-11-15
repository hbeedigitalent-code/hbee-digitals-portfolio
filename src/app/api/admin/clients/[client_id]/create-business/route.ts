// src/app/api/admin/clients/[client_id]/create-business/route.ts
//
// POST — create a merchant/business record for a self-registered Portal account that has no Growth Review, and
// connect the account to it, for an authenticated, 2FA-verified, active admin.
//
// Why this exists: invitations and the existing link flow assume a merchant created by a Growth Review. A client
// who comes to Hbee any other way still has to be connectable (S6.2 owner decision), and `merchants` is the
// existing business model, so no parallel table is introduced.
//
// WHAT IS VERIFIED vs NOT. Verified in code: the only columns this repository reads from merchants are
// id, business_name, contact_name, email, website, industry, country, created_at. NOT verified (no schema is in
// the repo; merchants rows are normally created by the submit_growth_assessment() database function): any
// NOT NULL / CHECK / UNIQUE constraint or trigger on merchants. So this route
//   * inserts ONLY those known columns, from the account's own record, never from the request body;
//   * refuses (409) if a merchant with the same email already exists, and returns it as a candidate so the admin
//     connects THAT one instead of creating a duplicate business;
//   * reports a database constraint failure as 409 `business_create_failed` with the Postgres code, instead of
//     guessing around it;
//   * links through the canonical link_client_to_merchant() RPC (row locking, collision refusals, history), and
//     if that refuses, deletes the merchant row it just created so no orphan is left behind.
// Exercise it on STAGING first.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { client_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  try {
    const clientId = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
    if (!ADMIN_UUID_RE.test(clientId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: client, error: clientError } = await db
      .from('clients')
      .select('id, merchant_id, full_name, business_name, email, website_url, country')
      .eq('id', clientId)
      .maybeSingle()
    if (clientError) return queryFailure('create-business client read', clientError)
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (client.merchant_id) {
      return NextResponse.json(
        { error: 'already_connected', message: 'This account is already connected to a business.' },
        { status: 409 },
      )
    }

    const email = typeof client.email === 'string' ? client.email.trim().toLowerCase() : ''
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'no_email', message: 'This account has no email address to create a business record from.' },
        { status: 409 },
      )
    }

    const { data: existing, error: existingError } = await db
      .from('merchants')
      .select('id, business_name, email')
      .ilike('email', email)
      .limit(5)
    if (existingError) return queryFailure('create-business duplicate check', existingError)
    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: 'business_exists',
          message: 'A business with this email already exists. Connect that one instead of creating a duplicate.',
          candidates: existing,
        },
        { status: 409 },
      )
    }

    const { data: created, error: createError } = await db
      .from('merchants')
      .insert({
        business_name: client.business_name || null,
        contact_name: client.full_name || null,
        email,
        website: client.website_url || null,
        country: client.country || null,
      })
      .select('id')
      .single()

    if (createError || !created) {
      const code = (createError as { code?: string } | null)?.code ?? 'n/a'
      console.error(`[admin-api] business create failed (code=${code})`)
      return NextResponse.json(
        {
          error: 'business_create_failed',
          code,
          message:
            'The business record could not be created (the database refused it). Nothing was changed. Connect an existing business instead, or ask for the merchants constraints to be reviewed.',
        },
        { status: 409 },
      )
    }

    const { data: outcome, error: linkError } = await db.rpc('link_client_to_merchant', {
      p_client_id: clientId,
      p_merchant_id: created.id,
      p_actor: userId,
      p_reason: 'business record created by admin for a self-registered portal account',
      p_allow_relink: false,
    })

    if (linkError || !outcome?.ok) {
      // Do not leave an orphan business behind. Scoped to the id this call just created.
      await db.from('merchants').delete().eq('id', created.id)
      console.error(`[admin-api] link after business create refused (${String(outcome?.reason ?? 'rpc error')})`)
      return NextResponse.json(
        { error: 'link_failed', message: 'The business was not created because the account could not be linked to it.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, merchantId: created.id })
  } catch (error) {
    return queryFailure('create-business', error)
  }
}
