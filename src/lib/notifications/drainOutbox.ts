// src/lib/notifications/drainOutbox.ts
//
// SERVER-ONLY. Delivers notification events that were enqueued IN THE SAME
// TRANSACTION as the business operation that caused them.
//
// WHY THE OUTBOX EXISTS. The previous design had finalize_upload return a
// `batch_completed` flag and then had the route call createNotification()
// afterwards. That left a crash window: the files were committed, the process
// died, and nobody was ever told. The event is now written inside the
// transaction, so if the files exist the event exists, and delivery is a
// separate, retryable step.
//
// AT-LEAST-ONCE. A crash after createNotification() succeeded but before the
// outcome was recorded means the event is retried. That is harmless:
// notifications carry a deterministic idempotency key, so the retry collapses
// onto the same row.

import { createNotification } from '@/lib/notifications/createNotification'
import { getPrivilegedClient } from '@/lib/admin-api-auth'

if (typeof window !== 'undefined') {
  throw new Error('drainOutbox.ts is server-only and must not be imported by client code')
}

export interface DrainSummary {
  claimed: number
  sent: number
  failed: number
}

/**
 * Claims and delivers up to `limit` pending notification events.
 *
 * Safe to call from a request handler (for latency) and from the scheduled job
 * (for recovery). Claims are exclusive and expiring, so the two never deliver
 * the same event at the same time, and a crashed drain releases its claim.
 *
 * Never throws.
 */
export async function drainNotificationOutbox(limit = 25): Promise<DrainSummary> {
  const summary: DrainSummary = { claimed: 0, sent: 0, failed: 0 }

  try {
    const db = getPrivilegedClient()
    if (!db) return summary

    const { data, error } = await db.rpc('claim_notification_events', { p_limit: limit })
    if (error) {
      console.warn(
        `[notify-outbox] claim failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
      )
      return summary
    }

    const events: any[] = Array.isArray(data) ? data : []
    summary.claimed = events.length

    for (const event of events) {
      let ok = false
      let reason: string | null = null

      try {
        // A client-scoped event with no recipient can never be delivered. Record
        // it as a failure so it dead-letters instead of being retried forever.
        if (event.scope === 'client' && !event.recipient_id) {
          reason = 'no_recipient'
        } else {
          const created = await createNotification({
            scope: event.scope,
            recipientId: event.recipient_id ?? null,
            type: event.type,
            title: event.title,
            message: event.message,
            link: event.link ?? null,
            entityType: event.entity_type ?? null,
            entityId: event.entity_id ?? null,
          })
          ok = created.ok
          if (!created.ok) reason = created.skipped ?? 'insert-error'
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : 'unknown error'
      }

      const { error: recordError } = await db.rpc('record_notification_attempt', {
        p_event_id: event.id,
        p_claim_token: event.claim_token,
        p_succeeded: ok,
        p_error: reason,
      })

      if (recordError) {
        // The claim lapses and the event is retried. createNotification is
        // idempotent, so a repeat cannot double-notify.
        console.warn(
          `[notify-outbox] outcome not recorded for ${event.id} — the claim will lapse`,
        )
      }

      if (ok) summary.sent++
      else summary.failed++
    }
  } catch (error) {
    console.error('[notify-outbox] unexpected error:', error)
  }

  return summary
}
