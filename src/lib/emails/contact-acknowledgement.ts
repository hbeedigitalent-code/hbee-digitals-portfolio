// src/lib/emails/contact-acknowledgement.ts
//
// The customer acknowledgement for the rebuilt Contact page (Phase 17), on the
// Hbee email system (hbee-email.ts). Sent once, from POST /api/contact, only
// after a valid 'enquiry' submission has been stored.
//
// It summarises the enquiry (type, business, budget, timeline — unanswered rows
// disappear) but never echoes the visitor's message back. It shows the Client
// Portal as a route for EXISTING clients only — no account is created and no
// eligibility is implied. Reply-to follows RESEND_REPLY_TO (configuredReplyTo).
//
// The legacy contact forms keep contact-confirmation.ts unchanged.

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export const CONTACT_ACK_SUBJECT = 'We’ve received your message — Hbee Digitals'

export interface ContactAcknowledgementData {
  fullName: string
  email: string
  enquiryType: string
  company?: string | null
  budget?: string | null
  timeline?: string | null
  /** De-duplication only — never rendered. */
  idempotencyKey?: string | null
}

type ContentData = Omit<ContactAcknowledgementData, 'email' | 'idempotencyKey'>

export function buildContactAcknowledgementEmail(data: ContentData): HbeeEmailOptions & { subject: string } {
  const firstName = cleanText(data.fullName).split(' ')[0] || ''
  const replyTo = configuredReplyTo()

  const rows = [
    { label: 'Your enquiry', value: cleanText(data.enquiryType) },
    { label: 'Business', value: cleanText(data.company) },
    { label: 'Estimated budget', value: cleanText(data.budget) },
    { label: 'Timeline', value: cleanText(data.timeline) },
  ].filter((r) => r.value)

  const blocks: HbeeEmailBlock[] = [
    {
      type: 'paragraph',
      text:
        'Thanks for getting in touch with Hbee Digitals. Your request has reached our team and we’re ' +
        'currently reviewing the information you shared.',
    },
    {
      type: 'paragraph',
      text:
        'We typically respond within 12–24 hours. If we need any additional context before responding ' +
        'properly, we’ll reach out by email.',
    },
    { type: 'heading', text: 'What happens next' },
    {
      type: 'steps',
      items: [
        'We review your request — we look through the context you provided and determine the right next step.',
        'We clarify anything necessary — if we need additional information before making a recommendation or responding fully, we’ll ask.',
        'We reply by email — you’ll hear from the Hbee team within our usual 12–24 hour response window.',
      ],
    },
    { type: 'heading', text: 'Summary' },
    { type: 'facts', rows },
    {
      type: 'callout',
      title: 'Already a client?',
      text: 'You can continue an existing project or conversation through your Client Portal.',
    },
    { type: 'link', label: 'Client Portal', url: '/client-login' },
  ]

  return {
    subject: CONTACT_ACK_SUBJECT,
    preheader: 'Thanks for reaching out. We’re reviewing your request and typically respond within 12–24 hours.',
    status: { tone: 'received', label: 'Message received' },
    heading: firstName ? `Thanks, ${firstName}. We’ve got your message.` : 'Thanks. We’ve got your message.',
    blocks,
    signoff: { name: 'The Hbee Digitals Team' },
    reason: 'You’re receiving this because you sent a message through Hbee Digitals.',
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
    footerLinks: [{ label: 'Client Portal', url: '/client-login' }],
  }
}

export function renderContactAcknowledgementEmail(data: ContentData) {
  const { subject, ...options } = buildContactAcknowledgementEmail(data)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendContactAcknowledgementEmail(data: ContactAcknowledgementData): Promise<EmailSendResult> {
  return deliver(
    'contact-acknowledgement',
    async () => {
      const { html, text } = renderContactAcknowledgementEmail(data)
      const replyTo = configuredReplyTo()
      return resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject: CONTACT_ACK_SUBJECT, html, text },
        data.idempotencyKey ? { idempotencyKey: `contact-acknowledgement:${data.idempotencyKey}` } : undefined,
      )
    },
    { templateSlug: 'contact-acknowledgement', recipientEmail: data.email, recipientName: data.fullName, subject: CONTACT_ACK_SUBJECT },
  )
}
