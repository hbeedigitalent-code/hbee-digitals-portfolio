// src/lib/emails/bfcm-checklist-acknowledgement.ts
//
// The visitor email for the Free 15-Point BFCM Readiness Checklist
// (POST /api/bfcm-checklist-request): the download link, a short explanation
// and the Growth Review call to action. Same Hbee email system and delivery
// wrapper as the other acknowledgements. Best-effort: deliver() never throws
// and the route does not depend on the outcome.

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'
import { CHECKLIST_GROUPS, CHECKLIST_PDF_PATH } from '@/components/site/bfcm-checklist/checklist-content'

const resend = new Resend(process.env.RESEND_API_KEY)

export const CHECKLIST_ACK_SUBJECT = 'Your BFCM Readiness Checklist — Hbee Digitals'

export interface ChecklistAcknowledgementData {
  email: string
  /** De-duplication only — never rendered. */
  idempotencyKey?: string | null
}

export function buildChecklistAcknowledgementEmail(): HbeeEmailOptions & { subject: string } {
  const replyTo = configuredReplyTo()
  const blocks: HbeeEmailBlock[] = [
    {
      type: 'paragraph',
      text:
        'Here is your free 15-point checklist. Use it to catch common conversion problems before more visitors ' +
        'arrive: open your store on your phone and work through each check.',
    },
    { type: 'link', label: 'Download the checklist (PDF)', url: CHECKLIST_PDF_PATH },
    { type: 'heading', text: 'What it covers' },
    { type: 'list', items: CHECKLIST_GROUPS.map((g) => `${g.name} — ${g.items.length} checks`) },
    { type: 'heading', text: 'Not sure which one is costing you sales?' },
    {
      type: 'paragraph',
      text:
        'Get a free Growth Review. Within 24 hours, we’ll review your store and send you the top 3 things we’d fix first. ' +
        'Free. No account needed. No obligation.',
    },
    { type: 'link', label: 'Get My Free Growth Review', url: '/growth-review?utm_source=bfcm_checklist&utm_medium=email&utm_content=checklist_email' },
  ]
  return {
    subject: CHECKLIST_ACK_SUBJECT,
    preheader: 'Your 15-point checklist is ready to download.',
    status: { tone: 'received', label: 'Checklist ready' },
    heading: 'Your BFCM Readiness Checklist is ready.',
    blocks,
    signoff: { name: 'The Hbee Digitals Team' },
    reason: 'You’re receiving this because you requested the BFCM Readiness Checklist from Hbee Digitals.',
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
  }
}

export function renderChecklistAcknowledgementEmail() {
  const { subject, ...options } = buildChecklistAcknowledgementEmail()
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendChecklistAcknowledgementEmail(data: ChecklistAcknowledgementData): Promise<EmailSendResult> {
  return deliver(
    'bfcm-checklist-acknowledgement',
    async () => {
      const { html, text } = renderChecklistAcknowledgementEmail()
      const replyTo = configuredReplyTo()
      return resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject: CHECKLIST_ACK_SUBJECT, html, text },
        data.idempotencyKey ? { idempotencyKey: `bfcm-checklist-ack:${data.idempotencyKey}` } : undefined,
      )
    },
    { templateSlug: 'bfcm-checklist-acknowledgement', recipientEmail: data.email, recipientName: null, subject: CHECKLIST_ACK_SUBJECT },
  )
}
