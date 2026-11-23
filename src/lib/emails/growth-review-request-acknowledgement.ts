// src/lib/emails/growth-review-request-acknowledgement.ts
//
// The visitor acknowledgement for the short Free Growth Review request
// (POST /api/growth-review-request). Built on the same Hbee email system and
// delivery wrapper as contact-acknowledgement.ts, but it speaks about the
// Growth Review, not a generic contact message.
//
// It never echoes the visitor's challenge text back, makes no account or
// eligibility implication, and sends no score. Best-effort: deliver() never
// throws, and the route does not depend on the outcome.

import { getResend } from '@/lib/emails/resend-client'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'


export const GROWTH_REQUEST_ACK_SUBJECT = 'Your free Growth Review request is in — Hbee Digitals'

export interface GrowthRequestAcknowledgementData {
  email: string
  /** Normalised store URL, shown in the summary. */
  website: string
  /** De-duplication only — never rendered. */
  idempotencyKey?: string | null
}

type ContentData = Pick<GrowthRequestAcknowledgementData, 'website'>

export function buildGrowthRequestAcknowledgementEmail(data: ContentData): HbeeEmailOptions & { subject: string } {
  const replyTo = configuredReplyTo()

  const blocks: HbeeEmailBlock[] = [
    {
      type: 'paragraph',
      text:
        'Thanks for requesting a free Growth Review. Within 24 hours, we’ll review your store and send you ' +
        'the top 3 things we’d fix first.',
    },
    { type: 'heading', text: 'What you’ll receive' },
    {
      type: 'list',
      items: [
        'Your top 3 priorities — the biggest issues we believe deserve attention first.',
        'Why they matter — a plain-language explanation of how each could affect the buying experience.',
        'What to do next — a practical next step for each priority.',
      ],
    },
    { type: 'heading', text: 'Your request' },
    { type: 'facts', rows: [{ label: 'Store', value: cleanText(data.website) }].filter((r) => r.value) },
    {
      type: 'paragraph',
      text: 'Free. No account needed. No obligation. If you’d like to add anything, just reply to this email.',
    },
  ]

  return {
    subject: GROWTH_REQUEST_ACK_SUBJECT,
    preheader: 'We’ll send your top 3 priorities within 24 hours.',
    status: { tone: 'received', label: 'Request received' },
    heading: 'Your Growth Review request is in.',
    blocks,
    signoff: { name: 'The Hbee Digitals Team' },
    reason: 'You’re receiving this because you requested a free Growth Review from Hbee Digitals.',
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
  }
}

export function renderGrowthRequestAcknowledgementEmail(data: ContentData) {
  const { subject, ...options } = buildGrowthRequestAcknowledgementEmail(data)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendGrowthRequestAcknowledgementEmail(
  data: GrowthRequestAcknowledgementData,
): Promise<EmailSendResult> {
  return deliver(
    'growth-review-request-acknowledgement',
    async () => {
      const { html, text } = renderGrowthRequestAcknowledgementEmail(data)
      const replyTo = configuredReplyTo()
      return getResend().emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject: GROWTH_REQUEST_ACK_SUBJECT, html, text },
        data.idempotencyKey ? { idempotencyKey: `growth-request-ack:${data.idempotencyKey}` } : undefined,
      )
    },
    {
      templateSlug: 'growth-review-request-acknowledgement',
      recipientEmail: data.email,
      recipientName: null,
      subject: GROWTH_REQUEST_ACK_SUBJECT,
    },
  )
}
