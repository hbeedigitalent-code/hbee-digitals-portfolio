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
  /**
   * Phase 17 — present only for the rebuilt Contact page ('enquiry'). Selects
   * the enquiry subject and rows; unanswered optional rows are omitted. The
   * legacy forms leave it undefined and render exactly as before.
   */
  enquiry?: {
    enquiryType: string
    budget?: string
    timeline?: string
    submittedAt: string
  }
  /**
   * Present only for the short Free Growth Review campaign request
   * (POST /api/growth-review-request). Selects the Growth Review subject and
   * rows. `message` is then the visitor's challenge ONLY — attribution travels
   * separately as `source`, never inside the message.
   */
  growthReview?: {
    /** Campaign source, e.g. "linkedin · bfcm_readiness_2026"; null when unattributed. */
    source: string | null
    submittedAt: string
  }
}

function growthReviewContent(input: AdminContactNotificationInput & { growthReview: NonNullable<AdminContactNotificationInput['growthReview']> }) {
  const g = input.growthReview
  const rows = [
    { label: 'Store URL', value: input.website || '' },
    { label: 'Visitor email', value: input.email },
    { label: 'Campaign source', value: g.source || '' },
    { label: 'Submitted at', value: g.submittedAt },
  ].filter((r) => r.value)
  const blocks: EmailBlock[] = [
    { type: 'facts', rows },
    { type: 'callout', title: 'Biggest challenge', text: input.message },
  ]
  return {
    subject: `New Growth Review request — ${input.fullName}`,
    preheader: `Free Growth Review request for ${input.website || input.fullName}`,
    blocks,
  }
}

function enquiryContent(input: AdminContactNotificationInput & { enquiry: NonNullable<AdminContactNotificationInput['enquiry']> }) {
  const e = input.enquiry
  const rows = [
    { label: 'Name', value: input.fullName },
    { label: 'Email', value: input.email },
    { label: 'Business / Company', value: input.company || '' },
    { label: 'Website / Store', value: input.website || '' },
    { label: 'Enquiry type', value: e.enquiryType },
    { label: 'Estimated budget', value: e.budget || '' },
    { label: 'Timeline', value: e.timeline || '' },
    { label: 'Submitted at', value: e.submittedAt },
  ].filter((r) => r.value)
  const blocks: EmailBlock[] = [
    { type: 'facts', rows },
    { type: 'callout', title: 'Message', text: input.message },
  ]
  return {
    subject: `New contact enquiry — ${e.enquiryType} — ${input.fullName}`,
    preheader: `${e.enquiryType} from ${input.fullName}`,
    blocks,
  }
}

export async function sendAdminContactNotification(
  input: AdminContactNotificationInput,
): Promise<EmailSendResult> {
  if (!resend) {
    console.warn('Resend API key not configured - skipping admin contact notification')
    return { ok: false, outcome: 'skipped', reason: 'resend_not_configured' }
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com'
  const subject = adminContactSubject(input)

  return deliver(
    'admin-contact-notification',
    // Rendering stays INSIDE deliver(): building links can raise a configuration
    // error, which must be reported, not thrown at the caller.
    async () => {
      const { html, text } = renderAdminContactNotification(input)
      return resend.emails.send(
        { from: emailFrom(), to: adminEmail, subject, html, text },
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

export function adminContactSubject(input: AdminContactNotificationInput): string {
  if (input.growthReview) return `New Growth Review request — ${input.fullName}`
  if (input.enquiry) return `New contact enquiry — ${input.enquiry.enquiryType} — ${input.fullName}`
  return `New ${input.isConsultation ? 'Consultation' : 'Inquiry'} from ${input.fullName}`
}

/** Subject and both bodies. Pure apart from the configured site origin. */
export function renderAdminContactNotification(input: AdminContactNotificationInput) {
  if (input.growthReview) {
    const { subject, preheader, blocks } = growthReviewContent({ ...input, growthReview: input.growthReview })
    const { html, text } = renderEmail({
      preheader,
      eyebrow: 'New Growth Review request',
      heading: 'New Growth Review request',
      blocks,
      cta: { label: 'Open the inbox', url: '/admin/inquiries' },
      reason: 'You are receiving this because a visitor requested a free Growth Review.',
      supportEmail: supportEmail(),
    })
    return { subject, html, text }
  }
  if (input.enquiry) {
    const { subject, preheader, blocks } = enquiryContent({ ...input, enquiry: input.enquiry })
    const { html, text } = renderEmail({
      preheader,
      eyebrow: 'New contact enquiry',
      heading: 'New contact enquiry',
      blocks,
      // The existing admin inbox; no new dashboard.
      cta: { label: 'Open the inbox', url: '/admin/inquiries' },
      reason: 'You are receiving this because a visitor sent a message through the Contact page.',
      supportEmail: supportEmail(),
    })
    return { subject, html, text }
  }

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
  return { subject, html, text }
}
