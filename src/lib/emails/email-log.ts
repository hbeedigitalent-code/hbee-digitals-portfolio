// src/lib/emails/email-log.ts
//
// SERVER-ONLY writer for public.email_logs.
//
// Until now this table was read by /admin/email-logs and written by NOTHING —
// the viewer has always shown an empty list because no code path ever inserted
// a row. This module is that writer.
//
// WHAT A ROW MEANS. `status = 'sent'` records that the PROVIDER ACCEPTED the
// message, which is not the same as it being delivered, and certainly not the
// same as it being read. Resend can still bounce, defer or drop a message it
// accepted, and it reports that asynchronously through webhooks this
// application does not yet consume. The admin viewer labels the state
// "Accepted" for exactly that reason. Do not read these rows as delivery
// confirmation.
//
// STATUS IS NOT GUESSED ANY MORE. An earlier version wrote `status = 'sent'`
// for FAILED attempts, on the reasoning that 'sent' was the documented column
// default and therefore certain to be accepted. That is wrong: it records a
// failure as a success. M1 instead adds `delivery_state`, a column with its own
// CHECK and an accurate vocabulary, and aborts the migration if a CHECK on
// `status` would make the mapping below unsafe.
//
// TWO COLUMNS, TWO JOBS:
//   delivery_state — authoritative and accurate. NULL on every row written
//                    before delivery tracking existed, which is exactly what
//                    keeps legacy rows distinguishable.
//   status         — the pre-existing vocabulary, kept so historical rows and
//                    any other reader are undisturbed.
//
// `accepted` means the PROVIDER TOOK the message. It is not delivery, and it is
// not a read receipt. Bounces and drops arrive later via Resend webhooks, which
// this application does not consume yet.
//
// FAILURE IS NEVER FATAL. Logging is observability. Every failure here is
// caught and reported as `false`; no caller's email, and no caller's request,
// fails because a log row could not be written.

import { getPrivilegedClient } from '@/lib/admin-api-auth'

if (typeof window !== 'undefined') {
  throw new Error('email-log.ts is server-only and must not be imported by client code')
}

/** The accurate vocabulary, matching the CHECK that M1 adds. */
export type EmailDeliveryState = 'accepted' | 'failed' | 'configuration_error'

/**
 * The legacy `status` value written alongside each delivery_state. Chosen so a
 * failure is never recorded as a success in EITHER column.
 */
const LEGACY_STATUS: Record<EmailDeliveryState, string> = {
  accepted: 'sent',
  failed: 'failed',
  configuration_error: 'failed',
}

const MAX_SUBJECT = 500
const MAX_NAME = 200
const MAX_ERROR = 2000

export interface EmailLogDescriptor {
  /** Stable identifier for the template, e.g. 'assessment-received'. */
  templateSlug: string
  recipientEmail: string
  recipientName?: string | null
  subject: string
  /** auth.users id of the acting admin, when a person triggered the send. */
  sentBy?: string | null
  relatedInquiryId?: string | null
}

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/**
 * Records one email attempt.
 *
 * `errorMessage` may carry provider detail — that is the point of the column,
 * and this table is readable only by the server and by authorized admins after
 * the access migration. It must never be echoed into a public response.
 */
export async function recordEmailLog(
  descriptor: EmailLogDescriptor,
  outcome: {
    state: EmailDeliveryState
    resendId?: string | null
    errorMessage?: string | null
  },
): Promise<boolean> {
  try {
    const db = getPrivilegedClient()
    if (!db) {
      console.warn('[email-log] privileged client unavailable — attempt not recorded')
      return false
    }

    const recipientEmail = clamp(descriptor.recipientEmail, MAX_NAME)
    if (!recipientEmail) return false

    const { error } = await db.from('email_logs').insert({
      template_slug: clamp(descriptor.templateSlug, MAX_NAME),
      recipient_email: recipientEmail,
      recipient_name: clamp(descriptor.recipientName, MAX_NAME),
      subject: clamp(descriptor.subject, MAX_SUBJECT),
      delivery_state: outcome.state,
      delivery_recorded_at: new Date().toISOString(),
      status: LEGACY_STATUS[outcome.state],
      resend_id: clamp(outcome.resendId, MAX_NAME),
      error_message: clamp(outcome.errorMessage, MAX_ERROR),
      related_inquiry_id: descriptor.relatedInquiryId || null,
      sent_by: descriptor.sentBy || null,
    })

    if (error) {
      console.warn(
        `[email-log] insert failed (code=${(error as { code?: string }).code ?? 'n/a'}) — ` +
          'the email itself is unaffected',
      )
      return false
    }

    return true
  } catch (error) {
    console.warn('[email-log] unexpected error while recording an attempt:', error)
    return false
  }
}
