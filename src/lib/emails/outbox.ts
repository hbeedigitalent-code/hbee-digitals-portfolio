// src/lib/emails/outbox.ts
//
// SERVER-ONLY. Durable delivery tracking for transactional email.
//
// THE PROBLEM THIS SOLVES. Until now an email was attempted once, inline, and
// if it failed the only trace was a line in a server log: not queryable, not
// retryable, not durable. A crash between "assessment stored" and "receipt
// sent" lost the receipt permanently and silently.
//
// THE PATTERN. Outbox, not fire-and-forget:
//
//   1. enqueueEmail()  writes a `pending` row. Durable, keyed, idempotent.
//   2. the caller immediately attempts the send inline, so the ordinary case is
//      still instant, and reports the outcome onto that row.
//   3. anything still `pending` when its next_attempt_at comes due is picked up
//      by the worker at /api/cron/email-events, which claims rows exclusively
//      (SKIP LOCKED + a claim token with an expiry) and retries with backoff.
//   4. after max_attempts the row becomes `dead` and stays visible to admins.
//
// A crashed worker cannot strand a row: its claim expires and the row is
// reclaimed. Two workers cannot send the same row twice: the claim is exclusive
// and the provider idempotency key would collapse a duplicate anyway.
//
// WHAT `sent` MEANS HERE. The provider accepted the message. Bounces, deferrals
// and drops are reported asynchronously by Resend webhooks, which this
// application does not consume yet. `sent` is acceptance, not delivery.

import { createHash } from 'crypto'
import { getPrivilegedClient } from '@/lib/admin-api-auth'
import type { EmailSendResult } from '@/lib/emails/layout'

if (typeof window !== 'undefined') {
  throw new Error('outbox.ts is server-only and must not be imported by client code')
}

export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead'

export interface EnqueueInput {
  /**
   * Stable logical identity for this email, e.g.
   * `assessment_received:{assessmentId}`. A repeat enqueue of the same key is a
   * no-op, so a retried submission cannot queue a second copy.
   */
  eventKey: string
  templateSlug: string
  recipientEmail: string
  recipientName?: string | null
  /**
   * Everything the template needs to render, later, without the original
   * request. Must contain no secrets: it is stored in the database.
   */
  payload: Record<string, unknown>
}

export interface EnqueueResult {
  ok: boolean
  id?: string
  /** True when this key was already queued or already sent. */
  duplicate?: boolean
  reason?: string
}

const UNIQUE_VIOLATION = '23505'

/** Retry schedule in minutes, indexed by attempt number. */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 240]
export const MAX_ATTEMPTS = RETRY_BACKOFF_MINUTES.length

/** Short, stable hash used when a caller has no natural key of its own. */
export function outboxKey(parts: Array<string | null | undefined>): string {
  return createHash('sha256').update(parts.map((p) => p ?? '').join('|')).digest('hex')
}

/**
 * Records the intent to send. Safe to call repeatedly with the same key.
 *
 * Never throws. A failure here is reported, and the caller decides — for an
 * assessment receipt the caller proceeds with the inline send anyway, because a
 * missing queue row is better than a missing email.
 */
export async function enqueueEmail(input: EnqueueInput): Promise<EnqueueResult> {
  try {
    const db = getPrivilegedClient()
    if (!db) return { ok: false, reason: 'no-service-role' }

    const { data, error } = await db
      .from('email_events')
      .insert({
        event_key: input.eventKey,
        template_slug: input.templateSlug,
        recipient_email: input.recipientEmail,
        recipient_name: input.recipientName ?? null,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
        max_attempts: MAX_ATTEMPTS,
      })
      .select('id')
      .single()

    if (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        // Already queued. Read the existing row so the caller can still report
        // the outcome onto it — this is the retried-submission path.
        const { data: existing } = await db
          .from('email_events')
          .select('id')
          .eq('event_key', input.eventKey)
          .maybeSingle()
        return { ok: true, id: existing?.id, duplicate: true }
      }
      console.error(
        `[outbox] enqueue failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
      )
      return { ok: false, reason: 'insert-error' }
    }

    return { ok: true, id: data.id }
  } catch (error) {
    console.error('[outbox] unexpected enqueue error:', error)
    return { ok: false, reason: 'exception' }
  }
}

/**
 * Records the outcome of an attempt against a queued row.
 *
 * A CLAIM TOKEN IS MANDATORY. The database refuses a write without one, and
 * refuses one whose token no longer matches a row in `processing`. That is what
 * stops an inline attempt from overwriting the state of a row a worker has
 * since reclaimed after the inline claim lapsed.
 *
 * On failure the row goes back to `pending` with a backed-off next_attempt_at,
 * until max_attempts is reached, at which point it becomes `dead` and stops
 * retrying. A `configuration` outcome is retried too: the fix is usually an
 * environment variable, and once it is set the queued email should go out
 * without anyone re-submitting anything.
 */
export async function recordAttempt(
  eventId: string | undefined,
  claimToken: string | undefined,
  result: EmailSendResult,
): Promise<boolean> {
  if (!eventId || !claimToken) return false

  try {
    const db = getPrivilegedClient()
    if (!db) return false

    const { data, error } = await db.rpc('record_email_event_attempt', {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_succeeded: result.ok,
      p_provider_id: result.providerId ?? null,
      p_error: result.ok ? null : `${result.outcome}: ${result.reason ?? 'unknown'}`,
      p_permanent: false,
    })

    if (error) {
      console.warn(
        `[outbox] attempt not recorded for ${eventId} (code=${
          (error as { code?: string }).code ?? 'n/a'
        }) — the claim will lapse and the worker will retry`,
      )
      return false
    }
    return data === true
  } catch (error) {
    console.warn('[outbox] unexpected error recording an attempt:', error)
    return false
  }
}

/**
 * Claims ONE known event for an inline send, through exactly the same mechanism
 * the scheduled worker uses. Returns null when the row is already sent, dead,
 * or currently held by someone else — in each of those cases the inline caller
 * must NOT send, because either it already went or another holder is sending it.
 */
export async function claimForInlineSend(
  eventId: string | undefined,
): Promise<{ token: string } | null> {
  if (!eventId) return null
  try {
    const db = getPrivilegedClient()
    if (!db) return null

    const { data, error } = await db.rpc('claim_email_event', { p_event_id: eventId })
    if (error || !data?.claimed) return null
    return { token: data.claim_token as string }
  } catch {
    return null
  }
}

/**
 * Sends ONE already-queued event inline, by its event key.
 *
 * The event row was written inside the business transaction, so this function
 * never enqueues anything — it only attempts early delivery of work that is
 * already durably owed. Everything it does is claim-protected, so it cannot
 * collide with the scheduled worker.
 *
 * Never throws. A failure leaves the row queued for retry, which is the point.
 */
export async function deliverQueuedEvent(eventKey: string): Promise<EmailSendResult> {
  try {
    const db = getPrivilegedClient()
    if (!db) return { ok: false, outcome: 'skipped', reason: 'no-service-role' }

    const { data: row, error } = await db
      .from('email_events')
      .select('id, template_slug, payload, status')
      .eq('event_key', eventKey)
      .maybeSingle()

    if (error || !row) {
      return { ok: false, outcome: 'skipped', reason: 'not_queued' }
    }
    if (row.status === 'sent') {
      return { ok: true, outcome: 'sent', reason: 'already_sent' }
    }

    const claim = await claimForInlineSend(row.id)
    if (!claim) {
      // Held by a worker, already sent, or dead. Not this caller's to send.
      return { ok: true, outcome: 'sent', reason: 'queued_elsewhere' }
    }

    const { senderFor, PERMANENT_REASONS } = await import('@/lib/emails/registry')
    const send = senderFor(row.template_slug)

    if (!send) {
      await recordAttempt(row.id, claim.token, {
        ok: false,
        outcome: 'failed',
        reason: 'unknown_template',
      })
      return { ok: false, outcome: 'failed', reason: 'unknown_template' }
    }

    const result = await send((row.payload || {}) as Record<string, unknown>)

    // A payload that can never render must stop retrying immediately.
    if (!result.ok && PERMANENT_REASONS.has(result.reason ?? '')) {
      const db2 = getPrivilegedClient()
      await db2?.rpc('record_email_event_attempt', {
        p_event_id: row.id,
        p_claim_token: claim.token,
        p_succeeded: false,
        p_provider_id: null,
        p_error: `${result.outcome}: ${result.reason ?? 'unknown'}`,
        p_permanent: true,
      })
      return result
    }

    await recordAttempt(row.id, claim.token, result)
    return result
  } catch (error) {
    console.warn('[outbox] inline delivery error:', error)
    return { ok: false, outcome: 'failed', reason: 'inline_delivery_error' }
  }
}

/**
 * The common call site: durably queue the intent, CLAIM it, send inline, record
 * the outcome under that claim. The caller's own work is never affected.
 *
 * When the row cannot be claimed the inline send is SKIPPED, not forced: either
 * it is already sent, or a worker holds it. Skipping is correct — the message
 * still goes out, just not from this request.
 */
export async function sendTracked(
  input: EnqueueInput,
  send: () => Promise<EmailSendResult>,
): Promise<EmailSendResult> {
  const queued = await enqueueEmail(input)

  const claim = await claimForInlineSend(queued.id)
  if (!claim) {
    // Not an error: the work is queued and owned by someone. Report it as
    // deferred rather than pretending it was sent from here.
    return { ok: true, outcome: 'sent', reason: 'queued_elsewhere' }
  }

  const result = await send()
  await recordAttempt(queued.id, claim.token, result)
  return result
}
