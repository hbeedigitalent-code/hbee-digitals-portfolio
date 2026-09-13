// src/lib/emails/hos/growth-program-approved.ts
//
// The outcome email for a deliberate APPROVED program decision.
//
// TRIGGER: queued by POST /api/admin/growth-assessments/[id]/decision AFTER
// record_program_decision() has committed. It is never queued before the
// decision succeeds, never queued by review completion, and never produced by
// scanning historical review_status values.
//
// IT TELLS THE TRUTH ABOUT RELEASE. `profileReleased` is decided at enqueue
// time by the SAME conditions the client Growth Profile endpoint enforces —
// a recorded approval, a linked client, a profile bound to the decision, and
// the GROWTH_PROFILE_RELEASE_ENABLED gate. Only when all of them hold does this
// email say the profile is available or show a portal button. Otherwise it
// confirms the approval and says access details follow, which is exactly what
// is true at that moment.
//
// WHAT IT NEVER SAYS: no revenue or sales guarantee, no deadline, no
// suggestion that paid implementation is required, and never an admin's
// internal decision note.

import { Resend } from 'resend'
import {
  renderEmail,
  deliver,
  emailFrom,
  emailReplyTo,
  emailUrl,
  supportEmail,
  type EmailBlock,
  type EmailSendResult,
} from '@/lib/emails/layout'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface GrowthProgramApprovedData {
  firstName: string
  email: string
  businessName: string
  /** The decision row this email reports. Used for provider-side idempotency. */
  decisionId: string
  /**
   * True ONLY when the Growth Profile is genuinely retrievable by the client
   * right now. Decided by the decision route, never by this template.
   */
  profileReleased: boolean
}

export async function sendGrowthProgramApprovedEmail(
  data: GrowthProgramApprovedData,
): Promise<EmailSendResult> {
  const { profileReleased } = data

  const blocks: EmailBlock[] = [
    { type: 'paragraph', text: `Hi ${data.firstName},` },
    {
      type: 'paragraph',
      text:
        `We have reviewed the Growth Readiness Assessment for ${data.businessName}, and ` +
        'we are pleased to tell you that your business has been approved for the Hbee ' +
        'Growth Support Initiative.',
    },
    { type: 'heading', text: 'What being approved means' },
    {
      type: 'list',
      items: [
        'Your Growth Profile is yours free, for life, as an approved merchant.',
        'It sets out where your growth is currently constrained and what we recommend you prioritise.',
        'Implementation is a separate, optional paid service. Nothing here requires you to buy it.',
      ],
    },
  ]

  if (profileReleased) {
    blocks.push(
      { type: 'heading', text: 'Your Growth Profile is ready' },
      {
        type: 'paragraph',
        text:
          'You can read it now in your secure client portal. Sign in with the account ' +
          'linked to this application.',
      },
    )
  } else {
    // The gate is closed, or the portal account is not linked yet. Saying the
    // profile is "available" here would be a link to a page that withholds it.
    blocks.push(
      { type: 'heading', text: 'What happens next' },
      {
        type: 'paragraph',
        text:
          'Your Growth Profile has been prepared. We will write to you again as soon as ' +
          'it is available in your client portal, with instructions for opening it.',
      },
    )
  }

  blocks.push({
    type: 'callout',
    title: 'No obligation',
    text:
      'Approval gives you the Growth Profile and the recommendations in it. Whether you ' +
      'ask us to implement any of them is entirely your decision, and the profile is ' +
      'yours either way.',
  })

  const subject = profileReleased
    ? 'Your Hbee Growth Profile is ready'
    : `${data.businessName} has been approved for the Hbee Growth Support Initiative`

  return deliver(
    'growth-program-approved',
    async () => {
      const { html, text } = renderEmail({
        preheader: profileReleased
          ? 'Your Growth Profile is available in your client portal.'
          : 'Your business has been approved for the Growth Support Initiative.',
        eyebrow: 'Application approved',
        heading: profileReleased
          ? 'Your Growth Profile is ready'
          : 'You have been approved',
        blocks,
        // The CTA appears ONLY when the profile is genuinely retrievable.
        // emailUrl() resolves through NEXT_PUBLIC_SITE_URL and raises a
        // configuration error rather than guessing an origin.
        cta: profileReleased
          ? {
              label: 'Open your Growth Profile',
              url: emailUrl('/client-portal/growth-profile'),
            }
          : undefined,
        signoff: { name: 'Habeeb Ismaila', title: 'CEO & Founder, Hbee Digitals' },
        reason:
          'You are receiving this because you submitted the Growth Readiness Assessment at hbeedigitals.com.',
        supportEmail: supportEmail(),
      })

      return resend.emails.send(
        {
          from: emailFrom(),
          ...emailReplyTo(),
          to: data.email,
          subject,
          html,
          text,
        },
        // Provider-side de-duplication, keyed on the decision itself. Combined
        // with the outbox event_key, a retry cannot deliver a second copy.
        { idempotencyKey: `growth-program-approved:${data.decisionId}` },
      )
    },
    {
      templateSlug: 'growth-program-approved',
      recipientEmail: data.email,
      recipientName: data.firstName,
      subject,
    },
  )
}
