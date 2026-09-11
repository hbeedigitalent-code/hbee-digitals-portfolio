// src/app/api/cron/email-events/route.ts
//
// POST — the durable email retry worker.
//
// AUTHENTICATION: `Authorization: Bearer <CRON_SECRET>`, compared in constant
// time. No session, no cookie, no user. If CRON_SECRET is unset the route
// refuses every request rather than running unauthenticated.
//
// CLAIMS ARE EXCLUSIVE AND EXPIRING. claim_email_events() takes rows with
// FOR UPDATE SKIP LOCKED, flips them to `processing`, and stamps a claim token
// with an expiry. Two workers therefore never take the same row, and a worker
// that crashes mid-send cannot strand one: recover_stale_email_claims() returns
// it to `pending` once the claim lapses.
//
// AT-LEAST-ONCE, NOT AT-MOST-ONCE. A crash after the provider accepted but
// before the outcome was recorded means the row is retried. That is why every
// template carries a provider idempotency key: Resend collapses the duplicate
// within its own window. That window is the provider's (24 hours), so it
// protects against a retry storm, not against a resend days later.

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getPrivilegedClient } from '@/lib/admin-api-auth'
import { PERMANENT_REASONS, senderFor } from '@/lib/emails/registry'

export const dynamic = 'force-dynamic'

const CLAIM_LIMIT = 20

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 16) {
    console.error('[email-worker] CRON_SECRET is not configured — refusing to run')
    return false
  }
  const match = /^Bearer\s+(.+)$/i.exec((request.headers.get('authorization') || '').trim())
  if (!match) return false
  return secretMatches(match[1], expected)
}

async function run(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[email-worker] privileged client unavailable')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const summary = { released: 0, claimed: 0, sent: 0, retried: 0, dead: 0 }

  try {
    // ---- 1. Return rows abandoned by a crashed worker -------------------
    const { data: released, error: releaseError } = await db.rpc('recover_stale_email_claims')
    if (releaseError) {
      console.error(
        `[email-worker] claim recovery failed (code=${
          (releaseError as { code?: string }).code ?? 'n/a'
        })`,
      )
    } else if (typeof released === 'number') {
      summary.released = released
    }

    // ---- 2. Claim due work ----------------------------------------------
    const { data: claimed, error: claimError } = await db.rpc('claim_email_events', {
      p_limit: CLAIM_LIMIT,
    })

    if (claimError) {
      console.error(
        `[email-worker] claim failed (code=${(claimError as { code?: string }).code ?? 'n/a'})`,
      )
      return NextResponse.json({ error: 'Worker failed' }, { status: 500 })
    }

    const rows: any[] = Array.isArray(claimed) ? claimed : []
    summary.claimed = rows.length

    // ---- 3. Send, one row at a time -------------------------------------
    for (const row of rows) {
      const send = senderFor(row.template_slug)

      if (!send) {
        // An unknown template will never become known by waiting. Stop it.
        await db.rpc('record_email_event_attempt', {
          p_event_id: row.id,
          p_claim_token: row.claim_token,
          p_succeeded: false,
          p_provider_id: null,
          p_error: 'unknown_template',
          p_permanent: true,
        })
        summary.dead++
        continue
      }

      let succeeded = false
      let providerId: string | null = null
      let errorText: string | null = null
      let permanent = false

      try {
        const result = await send((row.payload || {}) as Record<string, unknown>)
        succeeded = result.ok
        providerId = result.providerId ?? null
        if (!result.ok) {
          errorText = `${result.outcome}: ${result.reason ?? 'unknown'}`
          permanent = PERMANENT_REASONS.has(result.reason ?? '')
        }
      } catch (error) {
        errorText = error instanceof Error ? error.message : 'unknown error'
      }

      const { error: recordError } = await db.rpc('record_email_event_attempt', {
        p_event_id: row.id,
        p_claim_token: row.claim_token,
        p_succeeded: succeeded,
        p_provider_id: providerId,
        p_error: errorText,
        p_permanent: permanent,
      })

      if (recordError) {
        // The claim expires on its own, so this row is simply retried. That may
        // resend a message the provider already accepted — which is exactly
        // what the provider idempotency key is there to absorb.
        console.error(
          `[email-worker] outcome not recorded for ${row.id} (code=${
            (recordError as { code?: string }).code ?? 'n/a'
          }) — the claim will lapse and the row will be retried`,
        )
        continue
      }

      if (succeeded) summary.sent++
      else if (permanent || row.attempts + 1 >= row.max_attempts) summary.dead++
      else summary.retried++
    }

    console.info(
      `[email-worker] released=${summary.released} claimed=${summary.claimed} ` +
        `sent=${summary.sent} retried=${summary.retried} dead=${summary.dead}`,
    )

    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error('[email-worker] unexpected error:', error)
    return NextResponse.json({ error: 'Worker failed' }, { status: 500 })
  }
}

// Vercel Cron invokes a job with GET, and supplies the Authorization: Bearer
// CRON_SECRET header itself. POST is kept so the job can also be triggered by
// an external scheduler or by hand during testing. Both verbs go through
// exactly the same secret check.
export const GET = run
export const POST = run
