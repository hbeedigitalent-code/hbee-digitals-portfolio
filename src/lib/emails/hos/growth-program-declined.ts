// src/lib/emails/hos/growth-program-declined.ts
//
// The outcome email for a deliberate DECLINED program decision.
//
// TRIGGER: queued by POST /api/admin/growth-assessments/[id]/decision AFTER
// record_program_decision() has committed. Exactly one per decision.
//
// TONE IS DELIBERATE. Not being approved for the programme is a capacity and
// fit judgement, not a verdict on the business. This email therefore:
//   * does not rank, score or grade the merchant,
//   * does not imply they failed anything,
//   * does not suggest that declining paid implementation caused the outcome,
//   * does not upsell, and
//   * leaves the door open without promising a future review.
//
// INTERNAL NOTES NEVER APPEAR HERE. record_program_decision() stores an admin's
// `notes` on the decision row for the audit trail; that field is never read by
// this template and is never placed in the payload. The only client-facing text
// is a note the admin explicitly marks as shareable.

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

export interface GrowthProgramDeclinedData {
  firstName: string
  email: string
  businessName: string
  decisionId: string
  /**
   * OPTIONAL and explicitly client-facing. The admin has to tick a box for this
   * to be sent; the private `notes` field on the decision is a different value
   * and is never passed in here.
   */
  sharedMessage?: string | null
}

export async function sendGrowthProgramDeclinedEmail(
  data: GrowthProgramDeclinedData,
): Promise<EmailSendResult> {
  const blocks: EmailBlock[] = [
    { type: 'paragraph', text: `Hi ${data.firstName},` },
    {
      type: 'paragraph',
      text:
        `Thank you for applying to the Hbee Growth Support Initiative and for the time ` +
        `you put into the assessment for ${data.businessName}.`,
    },
    {
      type: 'paragraph',
      text:
        'We are not able to approve your application for the programme at this time. ' +
        'We take on a limited number of businesses for it, and this decision reflects ' +
        'that capacity and fit rather than any judgement about your business.',
    },
  ]

  if (data.sharedMessage) {
    blocks.push({
      type: 'callout',
      title: 'A note from our team',
      text: data.sharedMessage,
    })
  }

  blocks.push(
    {
      type: 'paragraph',
      text:
        'You are welcome to get in touch if you would like to talk it through, and you ' +
        'are welcome to apply again in future if your circumstances change.',
    },
    {
      type: 'paragraph',
      text: 'We genuinely wish you well with your growth.',
    },
  )

  const subject = 'An update on your Hbee Growth Support application'

  return deliver(
    'growth-program-declined',
    async () => {
      const { html, text } = renderEmail({
        preheader: 'An update on your application to the Growth Support Initiative.',
        eyebrow: 'Application update',
        heading: 'An update on your application',
        blocks,
        // No CTA. There is nothing to click, and a button here would be a
        // sales prompt attached to a rejection.
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
        { idempotencyKey: `growth-program-declined:${data.decisionId}` },
      )
    },
    {
      templateSlug: 'growth-program-declined',
      recipientEmail: data.email,
      recipientName: data.firstName,
      subject,
    },
  )
}
