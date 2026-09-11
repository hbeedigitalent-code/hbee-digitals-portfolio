// src/app/api/growth-reviews/[id]/complete/route.ts
//
// POST — complete a growth review and generate the merchant's Growth Profile.
// ACTIVE ADMINS ONLY.
//
// Before this change the route had no authentication of any kind, and it took
// `merchant_id` and `assessment_id` straight from the request body. Any
// anonymous caller could therefore fabricate a Growth Profile with arbitrary
// scores, mark any assessment reviewed, and overwrite an existing merchant's
// profile — choosing which records to write via the body.
//
// Two things changed. Authorization now runs first, and the merchant/assessment
// relationships are DERIVED FROM THE STORED growth_reviews ROW addressed by the
// route parameter. Caller-supplied ids are no longer trusted: if they are sent
// at all they must match the stored row, and a mismatch is rejected before any
// write.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are verified here independently.
//
// DATA ACCESS NOW USES A SERVER-ONLY PRIVILEGED CLIENT.
//
// The previous version ran every read and write on an anonymous client, which
// only worked because growth_reviews / growth_profiles / merchant_status had
// RLS disabled with broad anon grants. Those grants are being removed. Because
// this endpoint is now provably admin-only — session, user-bound 2FA and active
// admin_users membership are all verified above any data access — the privileged
// client is the correct role here, and it keeps the route working after the
// lockdown SQL is applied.
//
// This is NOT a generic privileged API: the review is addressed by the route
// parameter, every relationship is read back from the stored row, and no table
// name, filter or column list comes from the request.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  createNotification,
  resolveClientIdByMerchantId,
} from '@/lib/notifications/createNotification'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lazy, non-throwing privileged client. Built once and used for BOTH the
// admin_users membership lookup and this route's own review/assessment/profile
// operations — see the header note. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
let privilegedClient: any = null

function getPrivilegedClient() {
  if (privilegedClient) return privilegedClient

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  privilegedClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return privilegedClient
}

type AuthResult = { ok: true; userId: string } | { ok: false; response: NextResponse }

/**
 * Session + user-bound 2FA attestation + active admin_users membership.
 * Fails closed at every step, including when the membership lookup itself
 * errors — a lookup that cannot answer "yes" is never read as "yes".
 */
async function requireActiveAdmin(): Promise<AuthResult> {
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // Checked BEFORE any admin_users query, returning the SAME generic 401 as a
  // missing session. verifyAdmin2FACookie fails closed on a missing secret.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const adminClient = getPrivilegedClient()
  if (!adminClient) {
    console.error('[growth-reviews/complete] privileged client unavailable — denied')
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  const { data: adminRow, error: adminLookupError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminLookupError) {
    console.error(
      `[growth-reviews/complete] admin membership lookup failed (code=${
        (adminLookupError as { code?: string }).code ?? 'n/a'
      }) — denied`,
    )
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  // The acting admin, carried through so the completion can be attributed.
  return { ok: true, userId: user.id }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // AUTHORIZATION FIRST — before the body is parsed, before the review is
    // loaded, and before any write. This also builds (and validates) the
    // privileged client that every operation below uses.
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response

    const supabase = getPrivilegedClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { id } = params
    if (!UUID_RE.test(typeof id === 'string' ? id.trim() : '')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Malformed JSON must not surface as an unhandled 500.
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      review_notes,
      hgri_score,
      growth_classification,
      strengths,
      opportunities,
      visibility_score,
      conversion_score,
      retention_score,
      authority_score,
      scalability_score,
    } = body

    // RELATIONSHIPS COME FROM THE STORED ROW, NOT THE CALLER.
    // The route parameter identifies the review; merchant_id and assessment_id
    // are read from it. This read runs on the same anonymous client as every
    // other data operation here, so the data-access role is unchanged.
    const { data: reviewRow, error: reviewLoadError } = await supabase
      .from('growth_reviews')
      .select('id, merchant_id, assessment_id, status')
      .eq('id', id)
      .maybeSingle()

    if (reviewLoadError) {
      console.error(
        `[growth-reviews/complete] review load failed (code=${
          (reviewLoadError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to load review' }, { status: 500 })
    }

    if (!reviewRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const merchant_id: string | null = reviewRow.merchant_id ?? null
    const assessment_id: string | null = reviewRow.assessment_id ?? null

    if (!merchant_id || !assessment_id) {
      // A review with no stored relationships cannot be completed safely; the
      // route will not invent them from the request.
      console.error(
        `[growth-reviews/complete] review ${id} has no stored merchant_id/assessment_id`,
      )
      return NextResponse.json(
        { error: 'This review is not linked to a merchant and assessment.' },
        { status: 409 },
      )
    }

    // The admin UI still sends these for backwards compatibility. They are not
    // used for any write — they are only checked against the stored row, and a
    // mismatch is rejected before anything is written.
    const claimedMerchantId = (body as { merchant_id?: unknown }).merchant_id
    const claimedAssessmentId = (body as { assessment_id?: unknown }).assessment_id

    // THE EXPLICIT AUTHORIZED UPDATE. Completing a review upserts the profile
    // for (merchant, assessment), which means a second completion would have
    // silently replaced content a merchant had already been shown under an
    // approval. complete_growth_review() refuses that unless this flag is set,
    // and it records who set it. It must be a literal `true` — anything else,
    // including a truthy string, is treated as absent.
    const allowReleasedUpdate =
      (body as { allow_released_update?: unknown }).allow_released_update === true

    if (
      (typeof claimedMerchantId === 'string' && claimedMerchantId !== merchant_id) ||
      (typeof claimedAssessmentId === 'string' && claimedAssessmentId !== assessment_id)
    ) {
      console.error(
        `[growth-reviews/complete] relationship mismatch for review ${id} — rejected`,
      )
      return NextResponse.json(
        { error: 'Review relationship mismatch' },
        { status: 409 },
      )
    }

    // ------------------------------------------------------------------
    // ONE TRANSACTION: complete_growth_review().
    //
    // TWO DEFECTS THIS REPLACES, both of which were live until now:
    //
    //   1. This route wrote growth_assessments.review_status = 'approved' on
    //      EVERY completion. Completing a review is not approving a merchant
    //      for the program, and that write is one of the two sources of the
    //      four rows whose approval provenance cannot be established. It now
    //      writes 'reviewed', and it records NO decision — program approval is
    //      a separate deliberate act via /api/admin/growth-assessments/[id]/decision.
    //
    //   2. It INSERTed a new growth_profiles row with is_active = true every
    //      time, so completing the same review twice produced TWO active
    //      profiles for one merchant, and the client-portal reader had to guess.
    //      Completion is now an upsert keyed on (merchant_id, assessment_id),
    //      older profiles are retired rather than deleted, and a partial unique
    //      index makes two active profiles impossible even if some other writer
    //      tried.
    //
    // The review row, the assessment status, the profile and the merchant
    // lifecycle all commit together, so a crash cannot leave a completed review
    // with no profile.
    // ------------------------------------------------------------------
    const profileData = {
      scores: {
        pillars: {
          visibility: visibility_score || 0,
          conversion: conversion_score || 0,
          retention: retention_score || 0,
          authority: authority_score || 0,
          scalability: scalability_score || 0,
        },
        hgri: hgri_score || 0,
      },
      recommendations: generateRecommendations({
        visibility_score: visibility_score || 0,
        conversion_score: conversion_score || 0,
        retention_score: retention_score || 0,
        authority_score: authority_score || 0,
        scalability_score: scalability_score || 0,
      }),
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('business_name')
      .eq('id', merchant_id)
      .maybeSingle()

    const merchantName = merchant?.business_name || 'Business'
    const classification = growth_classification || 'Growth Potential'

    const { data: completion, error: completeError } = await supabase.rpc(
      'complete_growth_review',
      {
        p_review_id: id,
        p_assessment_id: assessment_id,
        p_merchant_id: merchant_id,
        p_actor: auth.userId,
        p_review: {
          hgri_score: hgri_score || 0,
          growth_classification: classification,
        },
        p_profile: {
          title: `${merchantName} - Growth Profile`,
          summary: generateSummary(merchantName, classification),
          hgri_score: hgri_score || 0,
          growth_classification: classification,
          profile_data: profileData,
          strengths: strengths || [],
          opportunities: opportunities || [],
        },
        p_allow_released_update: allowReleasedUpdate,
      },
    )

    if (completeError) {
      console.error(
        `[growth-reviews/complete] failed (code=${
          (completeError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to complete review' }, { status: 500 })
    }

    if (!completion?.ok) {
      const reason = String(completion?.reason ?? 'unknown')
      // The RPC validates the review, assessment and merchant TOGETHER. Either
      // mismatch means the stored relationships disagree with what was asked
      // for, and nothing was written.
      if (
        reason === 'assessment_merchant_mismatch' ||
        reason === 'review_relationship_mismatch'
      ) {
        return NextResponse.json({ error: 'Review relationship mismatch' }, { status: 409 })
      }
      if (reason === 'review_not_found' || reason === 'merchant_not_found') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (reason === 'profile_already_released') {
        // Nothing was written. The caller may repeat the request with
        // allow_released_update: true, which is the deliberate authorized
        // update and is recorded against the acting admin on the profile row.
        return NextResponse.json(
          {
            error:
              'This merchant has already been approved and shown this Growth Profile. ' +
              'Completing the review again would replace content they have seen. ' +
              'Confirm the update to proceed.',
            code: 'profile_already_released',
          },
          { status: 409 },
        )
      }
      console.error(`[growth-reviews/complete] refused: ${reason}`)
      return NextResponse.json({ error: 'Failed to complete review' }, { status: 500 })
    }

    const profileId: string = completion.profile_id

    // The remaining details the RPC does not own: review notes and per-pillar
    // scores on the review row itself. Reported separately if they fail — the
    // completion above is already committed and is the authoritative part.
    const { error: detailError } = await supabase
      .from('growth_reviews')
      .update({
        completed_at: new Date().toISOString(),
        review_notes,
        hgri_score,
        growth_classification: classification,
        strengths: strengths || [],
        opportunities: opportunities || [],
        visibility_score: visibility_score || 0,
        conversion_score: conversion_score || 0,
        retention_score: retention_score || 0,
        authority_score: authority_score || 0,
        scalability_score: scalability_score || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (detailError) {
      console.error(
        `[growth-reviews/${id}/complete] review completed but its notes/scores were not saved ` +
          `(code=${(detailError as { code?: string }).code ?? 'n/a'})`,
      )
    }

    // The client notification. NOTE the wording: the profile has been PREPARED.
    // It is not released to the client until a deliberate program decision is
    // recorded AND the release flag is on, so this must not announce access.
    const resolvedClientId = await resolveClientIdByMerchantId(merchant_id)
    if (resolvedClientId) {
      await createNotification({
        scope: 'client',
        recipientId: resolvedClientId,
        legacyMerchantId: merchant_id,
        type: 'growth_profile_ready',
        title: 'Your Growth Profile has been prepared',
        message:
          'Our team has finished reviewing your assessment. We will be in touch about next steps.',
        entityType: 'growth_profile',
        entityId: profileId,
        link: '/client-portal/growth-profile',
      })
    } else {
      console.warn(
        `[growth-reviews/${id}/complete] no client row for merchant ${merchant_id}; in-app notification skipped`,
      )
    }

    // Mirror the headline numbers onto the client record for the portal lists.
    // This grants nothing: it is display data, not authorization.
    await supabase
      .from('clients')
      .update({
        growth_profile_id: profileId,
        hgri_score: hgri_score || 0,
        growth_classification: classification,
      })
      .eq('merchant_id', merchant_id)

    return NextResponse.json({
      success: true,
      profile_id: profileId,
      profile_created: completion.profile_created === true,
      // True only when an already-released profile's content was deliberately
      // replaced. The acting admin is recorded on the profile row.
      released_content_updated: completion.released_content_updated === true,
      review_status: completion.review_status,
      // Said explicitly so no caller mistakes completion for approval.
      released: false,
      message: 'Review completed and profile prepared. Program approval is a separate decision.',
    })

  } catch (error) {
    console.error('Complete review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateSummary(businessName: string, classification: string): string {
  const summaries: Record<string, string> = {
    'Foundation': `${businessName} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
    'Foundation Stage': `${businessName} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
    'Growth Potential': `${businessName} shows strong Growth Potential. The business has solid fundamentals and is ready to scale with the right strategies in place.`,
    'Growth Ready': `${businessName} is Growth Ready. The business has proven systems, strong customer engagement, and is positioned for significant expansion.`,
    'Scale Ready': `${businessName} is Scale Ready. The business demonstrates exceptional operational maturity, brand authority, and is prepared for rapid scaling.`
  }
  return summaries[classification] || `${businessName} shows promising growth characteristics.`
}

function generateRecommendations(data: any): string[] {
  const recommendations: string[] = []
  
  if (data.visibility_score < 50) {
    recommendations.push('Implement a comprehensive SEO strategy to improve organic visibility')
    recommendations.push('Leverage content marketing to build brand awareness')
  }
  if (data.conversion_score < 50) {
    recommendations.push('Optimize website user experience and conversion funnel')
    recommendations.push('Implement A/B testing to improve conversion rates')
  }
  if (data.retention_score < 50) {
    recommendations.push('Build an email marketing automation system')
    recommendations.push('Implement customer loyalty and retention programs')
  }
  if (data.authority_score < 50) {
    recommendations.push('Develop a content strategy to build industry authority')
    recommendations.push('Leverage social proof and customer testimonials')
  }
  if (data.scalability_score < 50) {
    recommendations.push('Build scalable systems and processes for growth')
    recommendations.push('Implement automation tools to reduce manual work')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue optimizing current growth strategies')
    recommendations.push('Explore new channels for customer acquisition')
  }
  
  return recommendations
}