// src/app/api/cron/uploads/cleanup/route.ts
//
// The scheduled sweep that reclaims abandoned uploads and delivers pending
// notification events.
//
// AUTHENTICATION: a shared secret in `Authorization: Bearer <CRON_SECRET>`,
// compared in constant time. There is no session, no cookie and no user here,
// so the secret is the whole gate: if CRON_SECRET is unset the route refuses
// every request rather than running unauthenticated.
//
// This does NOT rely on another upload happening in the same project. It is a
// standalone scheduled job.
//
// ---------------------------------------------------------------------------
// LIFETIMES, AND WHY THEY ARE ORDERED THIS WAY
//
//   signed upload token   up to 24 h   (Supabase's documented resumable limit)
//   upload session        26 h         (UPLOAD_SESSION_TTL_HOURS)
//   cleanup eligibility   expires_at < now(), i.e. never before 26 h
//   cleanup claim         10 min, renewable by re-claiming
//
// The session deliberately OUTLIVES the token. While a token can still be used,
// a resumable upload may still be writing to that object, so deleting it could
// destroy an upload that is legitimately in progress. Only once no token can
// possibly be valid does the object become eligible for deletion.
//
// CLEANUP AND FINALIZATION CANNOT RACE, and the state machine is what
// guarantees it:
//
//   pending ──claim──▶ cleaning ──delete+mark──▶ cleaned      (terminal)
//      │
//      └──finalize──▶ finalized                               (terminal)
//
//   * finalize_upload() accepts ONLY `pending` / `finalizing`. Once a row is
//     `cleaning`, no metadata row can appear for it — so the object being
//     deleted can never acquire a reference.
//   * A `cleaning` row is NEVER returned to `pending`. An earlier worker may
//     still be inside storage.remove(); returning it to `pending` would open a
//     window in which finalization commits a metadata row that points at an
//     object about to be deleted. recover_stale_upload_claims() therefore
//     touches `finalizing` only.
//   * A lapsed `cleaning` claim is re-claimable AS `cleaning`, with a fresh
//     token. The stale worker's token stops working the moment it is reissued,
//     so a late delete from the old worker cannot mark the row cleaned.
//   * Before handing out any path, the claim function re-checks for a committed
//     metadata row. If one exists the session is REPAIRED to `finalized` and no
//     path is returned, so a finalized object can never be deleted — this is
//     the recovery path for a finalize whose database response was uncertain.
//   * A failure mid-sweep leaves the row `cleaning` with an expiring claim,
//     which the next run reclaims. Nothing is lost and nothing is stuck.

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { drainNotificationOutbox } from '@/lib/notifications/drainOutbox'
import { getPrivilegedClient } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

/** Rows handled per invocation. Keeps a single run well inside the function timeout. */
const CLAIM_LIMIT = 50
const NOTIFY_LIMIT = 25

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) {
    // Compare against itself so the work done is constant regardless.
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 16) {
    console.error('[uploads-cleanup] CRON_SECRET is not configured — refusing to run')
    return false
  }

  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return false

  return secretMatches(match[1], expected)
}

async function run(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[uploads-cleanup] privileged client unavailable')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const summary = { released: 0, claimed: 0, deleted: 0, repaired: 0, failed: 0, notified: 0 }

  try {
    // ---- 1. Release claims left behind by a crashed run -----------------
    // `finalizing` only — see the state-machine note above.
    const { data: recovered, error: recoverError } = await db.rpc('recover_stale_upload_claims')
    if (recoverError) {
      console.error(
        `[uploads-cleanup] claim recovery failed (code=${
          (recoverError as { code?: string }).code ?? 'n/a'
        })`,
      )
    } else if (typeof recovered === 'number') {
      summary.released = recovered
    }

    // ---- 2. Claim expired, genuinely-abandoned sessions ------------------
    const { data: claimed, error: claimError } = await db.rpc('cleanup_claim_expired_uploads', {
      p_limit: CLAIM_LIMIT,
    })

    if (claimError) {
      console.error(
        `[uploads-cleanup] claim failed (code=${
          (claimError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    const rows: any[] = Array.isArray(claimed) ? claimed : []
    summary.claimed = rows.length
    summary.repaired = rows.filter((r) => r.outcome === 'repaired').length

    // ---- 3. Delete the objects that are safe to delete -------------------
    for (const row of rows) {
      if (row.outcome !== 'claimed') continue

      try {
        const { error: removeError } = await db.storage.from(row.bucket).remove([row.object_path])

        if (removeError) {
          // Left `cleaning` with an expiring claim -> retried next run.
          console.warn(
            `[uploads-cleanup] object removal failed for session ${row.id} — will retry`,
          )
          summary.failed++
          continue
        }

        // Marks the object gone AND closes the batch if this was the last thing
        // in flight, so a partially successful batch cannot stay open forever.
        const { data: marked, error: markError } = await db.rpc('cleanup_mark_upload_cleaned', {
          p_upload_id: row.id,
          p_claim_token: row.claim_token,
        })

        if (markError || marked !== true) {
          console.warn(
            `[uploads-cleanup] session ${row.id} object removed but not marked — will retry`,
          )
          summary.failed++
          continue
        }

        summary.deleted++
      } catch (error) {
        console.error(`[uploads-cleanup] unexpected error on session ${row.id}:`, error)
        summary.failed++
      }
    }

    // ---- 4. Deliver notification events ----------------------------------
    //
    // Events are written INSIDE finalize_upload / cleanup_mark_upload_cleaned,
    // so an event exists if and only if the files it announces do. This pass is
    // pure delivery: it claims pending events exclusively and retries the ones
    // whose previous delivery failed or whose worker crashed.
    const drained = await drainNotificationOutbox(NOTIFY_LIMIT)
    summary.notified = drained.sent

    console.info(
      `[uploads-cleanup] released=${summary.released} claimed=${summary.claimed} ` +
        `deleted=${summary.deleted} repaired=${summary.repaired} ` +
        `failed=${summary.failed} notified=${summary.notified}`,
    )

    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error('[uploads-cleanup] unexpected error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Vercel Cron invokes a job with GET, and supplies the Authorization: Bearer
// CRON_SECRET header itself. POST is kept so the job can also be triggered by
// an external scheduler or by hand during testing. Both verbs go through
// exactly the same secret check.
export const GET = run
export const POST = run
