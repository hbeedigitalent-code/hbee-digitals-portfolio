// src/lib/emails/hos/assessment-received.ts
//
// Sent once, from POST /api/growth-assessment, immediately after a submission
// is stored (and retried from the email_events outbox via registry.ts).
// Trigger, queue, payload and function contract are unchanged.
//
// Phase 16.5: the first template on the Hbee email design system
// (src/lib/emails/hbee-email.ts). It is the inbox counterpart of the Growth
// Review confirmation page — "your Growth Review was received, and here's what
// happens next" — and says nothing the programme has not committed to:
//
//   - no portal / account CTA: an account is not part of receipt;
//   - no assessment reference: database identifiers are internal;
//   - no approval, consultation, engagement, turnaround, score or profile
//     promise, and no Growth Support Initiative / "free for life" language;
//   - signed by the team, not an individual.
//
// The assessmentId still arrives in the queued payload and is still used — as
// the provider idempotency key — but it is never rendered.

import { Resend } from 'resend'
import {
  configuredReplyTo,
  deliver,
  emailFrom,
  supportEmail,
  type EmailSendResult,
} from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailOptions } from '@/lib/emails/hbee-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export const ASSESSMENT_RECEIVED_SUBJECT = "We've received your Growth Review"

interface EmailData {
  firstName: string
  email: string
  /** Idempotency only. Never rendered. */
  assessmentId: string
  /**
   * Still present in queued payloads (and passed by registry.ts) for event
   * compatibility. Deliberately unused: receipt does not invite an account.
   */
  portalUrl?: string
}

/** The message content. Pure — no sending, no environment beyond the configured origin. */
export function buildAssessmentReceivedEmail(data: Pick<EmailData, 'firstName'>): HbeeEmailOptions & { subject: string } {
  const firstName = cleanText(data.firstName)
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const thanks = firstName ? `Thanks, ${firstName} — here's what happens next.` : "Thanks — here's what happens next."

  return {
    subject: ASSESSMENT_RECEIVED_SUBJECT,
    preheader: thanks,
    status: { tone: 'received', label: 'Assessment received' },
    heading: 'Thank you — we have your answers.',
    blocks: [
      { type: 'paragraph', text: greeting },
      {
        type: 'paragraph',
        text: 'Thank you for completing the Hbee Digitals Growth Review. Your answers are now with our team.',
      },
      {
        type: 'paragraph',
        text:
          "We'll review them alongside your website, online store or main selling page where that's useful, " +
          'so we understand the business as a whole.',
      },
      { type: 'heading', text: 'What happens next' },
      {
        type: 'steps',
        items: [
          'We review your answers alongside your website or store.',
          'We identify what deserves attention, and where the strongest opportunities or constraints appear.',
          'We email you with the most useful next step.',
        ],
      },
      {
        type: 'callout',
        title: 'Good to know',
        text:
          "Submitting a Growth Review doesn't mean approval, a paid engagement or portal access. " +
          'It helps us understand your business before we recommend the most useful next step.',
      },
      { type: 'paragraph', tone: 'muted', text: 'Nothing else is needed from you for now.' },
    ],
    signoff: { name: 'The Hbee Digitals Team' },
    reason: "You're receiving this because you submitted a Growth Review to Hbee Digitals.",
    // One source for the footer address, the "Reply to this email" wording and
    // the reply-to header (below), so the email never claims replies it can't receive.
    supportEmail: configuredReplyTo()?.address ?? supportEmail(),
    repliesMonitored: configuredReplyTo() !== null,
  }
}

/** Subject plus both bodies. Throws EmailConfigurationError when no site origin is configured. */
export function renderAssessmentReceivedEmail(data: Pick<EmailData, 'firstName'>) {
  const { subject, ...options } = buildAssessmentReceivedEmail(data)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendAssessmentReceivedEmail(data: EmailData): Promise<EmailSendResult> {
  // Rendering is INSIDE deliver(): building the links is what can raise a
  // configuration error, and that must be reported, not thrown at the caller.
  // The assessment itself is already stored by this point and stays stored.
  return deliver(
    'assessment-received',
    async () => {
      const { subject, html, text } = renderAssessmentReceivedEmail(data)
      const replyTo = configuredReplyTo()

      // Returned, not awaited-and-discarded: deliver() inspects the provider
      // envelope, because the Resend SDK RESOLVES with { error } on rejection.
      return resend.emails.send(
        {
          from: emailFrom(),
          ...(replyTo ? { replyTo: replyTo.header } : {}),
          to: data.email,
          subject,
          html,
          text,
        },
        // Provider-side idempotency. Resend de-duplicates on this key, so a
        // retry of the same logical send cannot deliver a second copy. Its
        // window is the provider's, not ours (Resend documents 24 hours), so
        // it protects against a retry storm — NOT against a resend days later.
        { idempotencyKey: `assessment-received:${data.assessmentId}` },
      )
    },
    {
      templateSlug: 'assessment-received',
      recipientEmail: data.email,
      recipientName: data.firstName,
      subject: ASSESSMENT_RECEIVED_SUBJECT,
    },
  )
}
