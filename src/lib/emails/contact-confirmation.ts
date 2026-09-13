// src/lib/emails/contact-confirmation.ts
//
// Sent from POST /api/contact to the visitor who submitted the contact form or
// the consultation popup.
//
// WHY THIS FILE EXISTS
// The contact route previously built its own <div> shell (`wrapEmail`) and
// interpolated submitted values straight into a template literal. It was the
// only email path in the codebase that bypassed src/lib/emails/layout.ts, and
// therefore the only one where a submitted value reached an inbox unescaped.
//
// Moving it here fixes that BY CONSTRUCTION rather than by adding escape calls
// to hand-written HTML: every dynamic value in a block goes through
// escapeHtml(), and the same block list also renders the plain-text alternative
// the old inline HTML never had.
//
// Subjects, recipients and the "skip quietly when Resend is unconfigured"
// behaviour are preserved exactly as the route had them.

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

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendContactConfirmation(
  fullName: string,
  email: string,
  isConsultation: boolean,
  /** Used only for provider-side idempotency, never rendered. */
  submissionId: string | null,
): Promise<EmailSendResult> {
  if (!resend) {
    console.warn('Resend API key not configured - skipping contact confirmation')
    return { ok: false, outcome: 'skipped', reason: 'resend_not_configured' }
  }

  const subject = isConsultation
    ? 'Your Free Consultation Request'
    : 'We received your inquiry'

  const blocks: EmailBlock[] = [
    { type: 'paragraph', text: `Hi ${fullName},` },
    {
      type: 'paragraph',
      text: `Thank you for contacting Hbee Digitals. We have received your ${
        isConsultation ? 'consultation request' : 'inquiry'
      }.`,
    },
    {
      type: 'paragraph',
      text: 'Our team will review your details and get back to you within 24 hours.',
    },
  ]

  return deliver(
    'contact-confirmation',
    async () => {
      const { html, text } = renderEmail({
        preheader: isConsultation
          ? 'We have your consultation request.'
          : 'We have your enquiry.',
        eyebrow: isConsultation ? 'Consultation requested' : 'Enquiry received',
        heading: 'Thank you for reaching out',
        blocks,
        signoff: { name: 'The Hbee Digitals Team', title: 'Hbee Digitals' },
        reason:
          'You are receiving this because you submitted the contact form at hbeedigitals.com.',
        supportEmail: supportEmail(),
      })

      // Returned, not awaited-and-discarded: deliver() inspects the provider
      // envelope, because the Resend SDK RESOLVES with { error } on rejection.
      return resend.emails.send(
        {
          from: emailFrom(),
          ...emailReplyTo(),
          to: email,
          subject,
          html,
          text,
        },
        submissionId
          ? { idempotencyKey: `contact-confirmation:${submissionId}` }
          : undefined,
      )
    },
    {
      templateSlug: 'contact-confirmation',
      recipientEmail: email,
      recipientName: fullName,
      subject,
    },
  )
}
