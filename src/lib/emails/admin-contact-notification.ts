// src/lib/emails/admin-contact-notification.ts
//
// Internal notification, sent from POST /api/contact alongside the visitor's
// confirmation.
//
// THIS IS THE EMAIL THE INJECTION FINDING WAS ABOUT.
// The route used to build this body by hand, interpolating `${fullName}`,
// `${email}`, `${phone}`, `${businessName}` and `${message}` — all of them
// attacker-controlled, all of them unescaped — into HTML delivered to
// ADMIN_NOTIFICATION_EMAIL. A submitted name containing markup became markup in
// a staff inbox.
//
// Every value below travels as a `facts` row or a `callout`, and the layout
// escapes each one. The submitted message stays in the notification because
// triaging an enquiry without reading it is not useful; it is simply carried
// safely now.

import { Resend } from 'resend'
import {
  renderEmail,
  deliver,
  emailFrom,
  supportEmail,
  type EmailBlock,
  type EmailSendResult,
} from '@/lib/emails/layout'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export interface AdminContactNotificationInput {
  fullName: string
  email: string
  phone: string | null
  company: string | null
  website: string | null
  service: string | null
  message: string
  isConsultation: boolean
  submissionId: string | null
}

export async function sendAdminContactNotification(
  input: AdminContactNotificationInput,
): Promise<EmailSendResult> {
  if (!resend) {
    console.warn('Resend API key not configured - skipping admin contact notification')
    return { ok: false, outcome: 'skipped', reason: 'resend_not_configured' }
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com'
  const label = input.isConsultation ? 'Consultation' : 'Inquiry'
  const subject = `New ${label} from ${input.fullName}`

  const blocks: EmailBlock[] = [
    {
      type: 'facts',
      rows: [
        { label: 'Name', value: input.fullName },
        { label: 'Email', value: input.email },
        { label: 'Phone', value: input.phone || 'Not provided' },
        { label: 'Business', value: input.company || 'Not provided' },
        { label: 'Website', value: input.website || 'Not provided' },
        { label: 'Service', value: input.service || 'Not provided' },
      ],
    },
    {
      type: 'callout',
      title: 'Message',
      text: input.message,
    },
  ]

  return deliver(
    'admin-contact-notification',
    async () => {
      const { html, text } = renderEmail({
        preheader: `${label} from ${input.fullName}`,
        eyebrow: `New ${label.toLowerCase()}`,
        heading: `New ${label.toLowerCase()}`,
        blocks,
        // Reply-to is deliberately NOT set to the submitted address. The layout's
        // emailReplyTo() is the configured support address; pointing an internal
        // notification's reply-to at unverified visitor input would make a
        // one-click reply land wherever the submitter chose.
        reason: 'You are receiving this because a visitor submitted the contact form.',
        supportEmail: supportEmail(),
      })

      return resend.emails.send(
        {
          from: emailFrom(),
          to: adminEmail,
          subject,
          html,
          text,
        },
        input.submissionId
          ? { idempotencyKey: `admin-contact-notification:${input.submissionId}` }
          : undefined,
      )
    },
    {
      templateSlug: 'admin-contact-notification',
      recipientEmail: adminEmail,
      subject,
      relatedInquiryId: input.submissionId,
    },
  )
}
