// src/lib/commerce/email-feedback.ts
//
// Pure. The wording Admin sees after a proposal is sent, an invoice is issued or a payment is recorded, given what the email step
// reported. Shared by the Admin pages and the tests so the sentences cannot drift.
//
// HONESTY RULES
//   * "client email sent" means the configured provider ACCEPTED the message. The application has no delivery confirmation (no
//     provider webhooks), so it never says "delivered".
//   * A provider's own error text is never shown. The server reports one of a few SAFE reason codes (below); the detailed,
//     sanitised failure stays in the logs and in email_logs.
//   * The business action is authoritative. Every failure sentence STARTS with the action having succeeded, because it did.

export type TransactionalEmailAction = 'proposal' | 'invoice' | 'payment'

/** What the server tells the Admin page. `reason` is one of EMAIL_REASONS, never provider text. */
export interface EmailFeedback {
  status: 'sent' | 'failed'
  reason: string
}

export const EMAIL_REASONS = ['accepted', 'no_recipient', 'configuration', 'provider_rejected', 'delivery_failed', 'timeout', 'unexpected'] as const

const DONE: Record<TransactionalEmailAction, string> = {
  proposal: 'Proposal sent',
  invoice: 'Invoice issued',
  payment: 'Payment recorded',
}

export function emailFeedbackMessage(action: TransactionalEmailAction, email: unknown, opts: { revised?: boolean } = {}): string {
  const done = action === 'proposal' && opts.revised ? 'Revised proposal sent' : DONE[action]
  const e = email && typeof email === 'object' ? (email as { status?: unknown; reason?: unknown }) : null
  // An older server response with no email result: say only what is known.
  if (!e || (e.status !== 'sent' && e.status !== 'failed')) return `${done}.`
  if (e.status === 'sent') return `${done} and client email sent.`
  if (e.reason === 'no_recipient') return `${done}, but client email failed: the client has no email address on file.`
  return `${done}, but client email failed.`
}
