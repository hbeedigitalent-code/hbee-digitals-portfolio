// src/app/api/admin/merchants/[merchant_id]/route.ts
//
// GET — everything the merchant detail page shows, in one call.
//
// Replaces FOUR direct browser queries in
// src/app/admin/merchants/[id]/page.tsx: merchants, merchant_status,
// growth_assessments and growth_profiles. All four ran as the caller's
// `authenticated` role, and three of those tables are being brought under RLS.
//
// Phase A2 adds two READ-ONLY relationships for admin navigation, both keyed on the stored merchant id (never
// on a name or an email): the portal account(s) whose clients.merchant_id points here, and the growth_reviews
// rows (so an assessment can link to its review). If either read fails the field is returned as null — "could
// not be determined" — which the page shows differently from "none linked". Neither failure fails the page.
//
// The merchant id comes from the route parameter and is UUID-validated; every
// related read is scoped by that same stored id, so one merchant's page can
// never assemble another merchant's records.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

const MERCHANT_COLUMNS = `
  id, business_name, contact_name, email, phone, website, country, industry,
  business_stage, store_age, created_at, updated_at
`

const ASSESSMENT_COLUMNS = `
  id, created_at, reviewed_at, status, review_status, hgri_score, classification,
  growth_classification, primary_constraint, recommended_focus,
  visibility_score, conversion_score, retention_score, authority_score, scalability_score
`

const PROFILE_COLUMNS = `
  id, title, summary, hgri_score, growth_classification, is_active, created_at, assessment_id
`

export async function GET(
  _request: Request,
  { params }: { params: { merchant_id: string } },
) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const merchantId =
      typeof params?.merchant_id === 'string' ? params.merchant_id.trim() : ''
    if (!ADMIN_UUID_RE.test(merchantId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: merchant, error: merchantError } = await db
      .from('merchants')
      .select(MERCHANT_COLUMNS)
      .eq('id', merchantId)
      .maybeSingle()

    if (merchantError) return queryFailure('merchant detail', merchantError)
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // maybeSingle: a merchant may legitimately have no lifecycle row yet.
    const { data: status, error: statusError } = await db
      .from('merchant_status')
      .select('merchant_id, status, current_stage, last_activity, updated_at')
      .eq('merchant_id', merchantId)
      .maybeSingle()

    if (statusError) return queryFailure('merchant status', statusError)

    const { data: assessments, error: assessmentError } = await db
      .from('growth_assessments')
      .select(ASSESSMENT_COLUMNS)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (assessmentError) return queryFailure('merchant assessments', assessmentError)

    const { data: profiles, error: profileError } = await db
      .from('growth_profiles')
      .select(PROFILE_COLUMNS)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (profileError) return queryFailure('merchant profiles', profileError)

    const { data: clients, error: clientsError } = await db
      .from('clients')
      .select('id, full_name, business_name, email, status')
      .eq('merchant_id', merchantId)
      .limit(5)

    const { data: reviews, error: reviewsError } = await db
      .from('growth_reviews')
      .select('id, status, assessment_id, completed_at')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (clientsError) console.error('[admin-api] merchant linked clients read failed')
    if (reviewsError) console.error('[admin-api] merchant reviews read failed')

    return NextResponse.json({
      merchant,
      status: status || null,
      assessments: assessments || [],
      profiles: profiles || [],
      clients: clientsError ? null : clients || [],
      reviews: reviewsError ? null : reviews || [],
    })
  } catch (error) {
    console.error('[admin-api] merchant detail error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
