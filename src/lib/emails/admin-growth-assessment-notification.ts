// src/lib/emails/admin-growth-assessment-notification.ts
//
// Internal notification, sent from POST /api/growth-assessment alongside the
// merchant's receipt. Trigger, signature and failure behaviour are unchanged:
// it never throws, so a mail problem cannot fail the submission.
//
// Rebuilt on the shared branded layout. Deliberately carries only identifying
// details and a link into the admin area — no assessment answers, no scores and
// no review notes travel by email.

import { Resend } from 'resend'
import {
  renderEmail,
  deliver,
  emailFrom,
  emailReplyTo,
  supportEmail,
  type EmailBlock,
  type EmailSendResult,
} from '@/lib/emails/layout'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAdminGrowthAssessmentNotification(
  contactName: string,
  businessName: string,
  email: string,
  // Optional so existing callers keep working. When supplied it becomes the
  // provider idempotency key, which is what makes a retried submission safe.
  assessmentId?: string,
): Promise<EmailSendResult> {
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com'

  const blocks: EmailBlock[] = [
    {
      type: 'paragraph',
      text: 'A new Growth Readiness Assessment has been submitted and is waiting for review.',
    },
    {
      type: 'facts',
      rows: [
        { label: 'Business', value: businessName || '—' },
        { label: 'Contact', value: contactName || '—' },
        { label: 'Email', value: email || '—' },
        { label: 'Submitted', value: new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC' },
      ],
    },
    {
      type: 'callout',
      title: 'Answers and scores are not included',
      text:
        'Open the review in the admin area to see the submission. Assessment answers, ' +
        'scores and review notes are never sent by email.',
    },
  ]

  return deliver('admin-growth-assessment', async () => {
    const { html, text } = renderEmail({
      preheader: `New assessment from ${businessName || 'a merchant'} awaiting review.`,
      eyebrow: 'Internal notification',
      heading: 'New Growth Readiness Assessment',
      blocks,
      cta: { label: 'Open the review queue', url: '/admin/growth-reviews' },
      reason:
        'You are receiving this because you are listed as an Hbee Digitals admin recipient.',
      supportEmail: supportEmail(),
    })

    // Returned, not awaited-and-discarded: deliver() inspects the provider
    // envelope, because the Resend SDK RESOLVES with { error } on rejection.
    return resend.emails.send(
      {
        from: emailFrom(),
        ...emailReplyTo(),
        to: adminRecipient,
        subject: `New assessment — ${businessName || 'Unknown business'}`,
        html,
        text,
      },
      // Provider-side idempotency. Resend de-duplicates on this key, so a
      // retry of the same logical send cannot deliver a second copy. Its
      // window is the provider's, not ours (Resend documents 24 hours), so
      // it protects against a retry storm — NOT against a resend days later.
      { idempotencyKey: `admin-growth-assessment:${assessmentId ?? email}` },
    )
  }, {
    templateSlug: 'admin-growth-assessment',
    recipientEmail: adminRecipient,
    recipientName: 'Hbee Digitals admin',
    subject: `New assessment — ${businessName || 'Unknown business'}`,
  },
  )
}
