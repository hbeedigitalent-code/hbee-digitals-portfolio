// src/app/api/client-portal/growth-profile/route.ts
//
// GET — the caller's own Growth Profile, resolved entirely server-side.
//
// Replaces the browser-side resolution the portal page used to do, which tried
// four strategies in order: merchants.email = user.email, then
// merchant_accounts.email = user.email, then clients.merchant_id, and finally
// `user.user_metadata.merchant_id`. The first two authorised by email match;
// the last read a field the user can write themselves via
// supabase.auth.updateUser({ data: ... }), so a client could point it at
// another merchant. Both patterns are gone.
//
// The only authoritative chain is:
//
//   auth.uid()  ->  clients row (user_id)  ->  clients.merchant_id
//
// Nothing is resolved from an email address, a request parameter, or user
// metadata, and no candidate merchant is ever disclosed.
//
// AMBIGUITY IS REJECTED, NOT GUESSED. If the session resolves to more than one
// clients row, the request is refused rather than picking one.
//
// The response is an explicit allow-list of merchant-safe fields. Admin review
// notes, raw growth_reviews rows, internal decision fields and the unfiltered
// profile_data blob never leave the server.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'


// ---------------------------------------------------------------------------
// HISTORICAL APPROVAL GATE — OFF BY DEFAULT. DO NOT REMOVE WITHOUT REVIEW.
//
// Stored `review_status = 'approved'` values cannot, on their own, evidence a
// deliberate program approval. At least two writers set that value without
// recording a decision: the old completion route, and a browser-side flow in
// admin/growth-assessments/[id] that wrote 'approved' for any completed
// review. Which writer produced any particular row is NOT established, and no
// separate decision field exists. This endpoint therefore must not read those
// values as an approval by themselves.
//
// So the release is gated. Until GROWTH_PROFILE_RELEASE_ENABLED is set to
// 'true' in the server environment, an otherwise-eligible merchant receives the
// `under_review` state instead of profile content. Nothing is approved,
// revoked, or rewritten by this flag — it only withholds content.
//
// Turning it on is a deliberate act that should follow an eligibility review of
// the existing approved rows (see the batch report). Because a real decision
// field does not exist yet, that review is a human step, not a query.
// ---------------------------------------------------------------------------
function isProfileReleaseEnabled(): boolean {
  return process.env.GROWTH_PROFILE_RELEASE_ENABLED === 'true'
}

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

/** Coerce a stored score into a number the UI can render, or null. */
function toScore(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Only the five known pillars are echoed back, each as a plain number. */
function safePillars(profileData: any): Record<string, number> | null {
  const pillars = profileData?.scores?.pillars
  if (!pillars || typeof pillars !== 'object') return null

  const allowed = ['visibility', 'conversion', 'retention', 'authority', 'scalability']
  const out: Record<string, number> = {}
  for (const key of allowed) {
    const n = toScore(pillars[key])
    if (n !== null) out[key] = n
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Strings only, trimmed, bounded — never objects lifted out of a JSON blob. */
function safeStringList(value: unknown, max = 25): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
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

    // Authoritative link 1: session user -> clients row.
    // limit(2) rather than maybeSingle() so ambiguity is detectable and can be
    // refused explicitly instead of surfacing as a generic query error.
    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id, merchant_id')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error(
        `[client-portal/growth-profile] client lookup failed (code=${
          (clientError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 })
    }

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (clientRows.length > 1) {
      // Ambiguous ownership: refuse rather than choose. No merchant is named.
      console.error(
        `[client-portal/growth-profile] ambiguous client ownership for user ${user.id}`,
      )
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const merchantId: string | null = clientRows[0].merchant_id ?? null

    // Authoritative link 2: clients.merchant_id. When it is absent the account
    // is simply not connected yet — an ordinary state for 5 of the 8 current
    // clients, not corruption. No candidate merchants are searched for or
    // returned, and nothing is linked by email.
    if (!merchantId) {
      return NextResponse.json({ state: 'not_connected' })
    }

    // Has this merchant submitted anything at all? Existence only — no status
    // is read from here, and nothing about the review is disclosed.
    const { data: anyAssessment } = await adminClient
      .from('growth_assessments')
      .select('id')
      .eq('merchant_id', merchantId)
      .limit(1)

    if (!anyAssessment || anyAssessment.length === 0) {
      return NextResponse.json({ state: 'no_assessment' })
    }

    // ---- THE PROGRAM DECISION ------------------------------------------
    //
    // Release is authorized by growth_program_decisions and by NOTHING else.
    //
    // review_status is not consulted at all any more — not even to withhold.
    // An earlier version short-circuited on the LATEST assessment being
    // 'rejected', which was wrong in a specific and damaging way: a merchant who
    // had been deliberately approved, and who later submitted a reassessment
    // that was rejected, would have silently lost access to the profile they
    // were granted. Withdrawal has to be a deliberate decision, so a rejected
    // reassessment now changes nothing until an admin records one.
    //
    // The decision is read at MERCHANT level and ordered by decision_seq, a
    // monotonic sequence. Ordering by a timestamp alone could tie.
    const { data: decisionRows, error: decisionError } = await adminClient
      .from('growth_program_decisions')
      .select('decision, decision_seq, profile_id, assessment_id')
      .eq('merchant_id', merchantId)
      .order('decision_seq', { ascending: false })
      .limit(1)

    if (decisionError) {
      // A gate that cannot answer "yes" is never read as "yes".
      console.error(
        '[growth-profile] decision lookup failed (code=' +
          ((decisionError as { code?: string }).code ?? 'n/a') +
          ') — withholding',
      )
      return NextResponse.json({ state: 'under_review' })
    }

    const effective = decisionRows?.[0] ?? null
    const decision = effective?.decision ?? null

    if (decision === 'declined') {
      // Say nothing further, and never leak review notes.
      return NextResponse.json({ state: 'not_available' })
    }

    if (decision !== 'approved') {
      // No decision recorded, or a release that was deliberately withdrawn.
      // Includes every historical 'approved' review_status that has no
      // decision behind it. Withheld, never rewritten.
      return NextResponse.json({ state: 'under_review' })
    }

    // A recorded approval still passes through the release flag, which stays
    // OFF until the whole approval/release flow has been tested end to end.
    if (!isProfileReleaseEnabled()) {
      return NextResponse.json({ state: 'under_review' })
    }
    // ---- THE PROFILE THE DECISION AUTHORIZED ---------------------------
    //
    // Release is bound to `profile_id` ON THE DECISION — the profile an admin
    // actually looked at and approved — and NOT to whichever profile happens to
    // be active now. Those two are not the same thing: a reassessment creates a
    // newer active profile, and serving that one would publish content nobody
    // ever approved.
    //
    // The database guarantees an approval always names a profile (a CHECK
    // constraint on growth_program_decisions), so a missing id here means the
    // row was written by something other than the decision endpoint.
    if (!effective.profile_id) {
      console.error(
        `[client-portal/growth-profile] approval for merchant ${merchantId} names no profile`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    const { data: profile, error: profileError } = await adminClient
      .from('growth_profiles')
      .select(
        'id, merchant_id, assessment_id, title, summary, hgri_score, growth_classification, profile_data, strengths, opportunities, created_at',
      )
      .eq('id', effective.profile_id)
      .maybeSingle()

    if (profileError) {
      console.error(
        `[client-portal/growth-profile] profile read failed (code=${
          (profileError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 })
    }

    if (!profile) {
      // The approved profile no longer exists. Withhold rather than substitute.
      console.error(
        `[client-portal/growth-profile] approved profile ${effective.profile_id} is missing`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    // DEFENCE IN DEPTH. The decision was validated when it was recorded, but the
    // rows can drift afterwards, so the ownership chain is re-checked here
    // rather than assumed from the decision.
    if (String(profile.merchant_id) !== String(merchantId)) {
      console.error(
        `[client-portal/growth-profile] profile ${profile.id} merchant mismatch`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    if (!profile.assessment_id) {
      console.error(
        `[client-portal/growth-profile] profile ${profile.id} has no assessment binding`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    const { data: boundAssessment, error: boundError } = await adminClient
      .from('growth_assessments')
      .select('id, merchant_id')
      .eq('id', profile.assessment_id)
      .maybeSingle()

    if (
      boundError ||
      !boundAssessment ||
      String(boundAssessment.merchant_id) !== String(merchantId)
    ) {
      console.error(
        `[client-portal/growth-profile] profile ${profile.id} is bound to an assessment that is not this merchant's`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    // Latest PDF, if one exists. file_url only — no storage path, no row.
    const { data: pdfRows } = await adminClient
      .from('growth_profile_pdfs')
      .select('file_url, uploaded_at')
      .eq('growth_profile_id', profile.id)
      .eq('is_latest', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)

    const pdfUrl =
      typeof pdfRows?.[0]?.file_url === 'string' ? pdfRows[0].file_url : null

    // Explicit allow-list. profile_data is NOT forwarded as a blob: only the
    // five known pillar numbers and the recommendation strings are lifted out
    // of it, so any internal key added to that JSON in future cannot leak.
    return NextResponse.json({
      state: 'ready',
      profile: {
        id: profile.id,
        title: typeof profile.title === 'string' ? profile.title : null,
        summary: typeof profile.summary === 'string' ? profile.summary : null,
        hgri_score: toScore(profile.hgri_score),
        growth_classification:
          typeof profile.growth_classification === 'string'
            ? profile.growth_classification
            : null,
        pillars: safePillars(profile.profile_data),
        recommendations: safeStringList(profile.profile_data?.recommendations),
        strengths: safeStringList(profile.strengths),
        opportunities: safeStringList(profile.opportunities),
        created_at: profile.created_at,
        pdf_url: pdfUrl,
      },
    })
  } catch (error) {
    console.error('❌ Client growth profile error:', error)
    return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 })
  }
}
