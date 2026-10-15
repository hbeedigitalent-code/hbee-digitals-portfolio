// src/lib/emails/hos/growth-program-declined.ts
//
// The outcome email for a deliberate DECLINED program decision.
//
// TRIGGER (unchanged): queued by POST /api/admin/growth-assessments/[id]/decision
// AFTER record_program_decision() has committed. Exactly one per decision.
//
// TONE IS DELIBERATE (unchanged): a fit judgement, not a verdict — no ranking,
// scoring, upsell or implied failure, and the door left open without promising
// a future review. INTERNAL NOTES NEVER APPEAR HERE; the only client-facing text
// is a note the admin explicitly marked shareable. No portal access is offered.
//
// Phase 16.6: moved onto the Hbee email system with permanent lifecycle
// language (Growth Review; no programme/capacity/slot wording), a team signoff,
// and reply-to from the configured RESEND_REPLY_TO.

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface GrowthProgramDeclinedData {
  firstName: string
  email: string
  businessName: string
  /** Idempotency only — never rendered. */
  decisionId: string
  /** Only a note the admin explicitly marked as shareable. */
  sharedMessage?: string | null
}

type ContentData = Pick<GrowthProgramDeclinedData, 'firstName' | 'businessName' | 'sharedMessage'>

export function buildGrowthProgramDeclinedEmail(data: ContentData): HbeeEmailOptions & { subject: string } {
  const firstName = cleanText(data.firstName)
  const business = cleanText(data.businessName) || 'your business'
  const replyTo = configuredReplyTo()

  const blocks: HbeeEmailBlock[] = [
    { type: 'paragraph', text: firstName && firstName !== 'there' ? `Hi ${firstName},` : 'Hi,' },
    {
      type: 'paragraph',
      text: `Thank you for completing the Growth Review for ${business}, and for the time you put into your answers.`,
    },
    {
      type: 'paragraph',
      text:
        "After reviewing it carefully, we've decided not to move forward at this stage. This reflects fit " +
        'and timing, not a judgement about your business.',
    },
  ]
  const shared = cleanText(data.sharedMessage)
  if (shared) blocks.push({ type: 'callout', title: 'A note from the team', text: shared })
  blocks.push({
    type: 'paragraph',
    text: "You're welcome to get in touch if you'd like to talk it through, or if your circumstances change.",
  })

  return {
    subject: 'An update on your Growth Review',
    preheader: `An update on the Growth Review for ${business}.`,
    status: { tone: 'declined', label: 'Growth Review update' },
    heading: 'An update on your Growth Review.',
    blocks,
    signoff: { name: 'The Hbee Digitals Team' },
    reason: "You're receiving this because you submitted a Growth Review to Hbee Digitals.",
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
  }
}

export function renderGrowthProgramDeclinedEmail(data: ContentData) {
  const { subject, ...options } = buildGrowthProgramDeclinedEmail(data)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendGrowthProgramDeclinedEmail(data: GrowthProgramDeclinedData): Promise<EmailSendResult> {
  const subject = buildGrowthProgramDeclinedEmail(data).subject
  return deliver(
    'growth-program-declined',
    async () => {
      const { html, text, attachments } = renderGrowthProgramDeclinedEmail(data)
      const replyTo = configuredReplyTo()
      return resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject, html, text, attachments },
        { idempotencyKey: `growth-program-declined:${data.decisionId}` },
      )
    },
    { templateSlug: 'growth-program-declined', recipientEmail: data.email, recipientName: data.firstName, subject },
  )
}
