// src/lib/emails/hos/growth-program-approved.ts
//
// The outcome email for a deliberate APPROVED program decision.
//
// TRIGGER (unchanged): queued by POST /api/admin/growth-assessments/[id]/decision
// AFTER record_program_decision() has committed — never by review completion,
// never by scanning historical review_status values.
//
// IT TELLS THE TRUTH ABOUT RELEASE (unchanged). `profileReleased` is decided at
// enqueue time by the same conditions the client Growth Profile endpoint
// enforces. Only then does this email say the profile is available or show the
// portal button.
//
// Phase 16.6: moved onto the Hbee email system (hbee-email.ts) with permanent
// lifecycle language — Growth Review, not the Growth Support Initiative; no
// "free for life"; no capacity/slot language; signed by the team. Reply-to uses
// the configured RESEND_REPLY_TO via configuredReplyTo().

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface GrowthProgramApprovedData {
  firstName: string
  email: string
  businessName: string
  /** The decision row this email reports. Idempotency only — never rendered. */
  decisionId: string
  /** True ONLY when the Growth Profile is genuinely retrievable right now. Decided by the decision route. */
  profileReleased: boolean
  /**
   * True when no portal account is connected yet, so the decision route also
   * sends a separate Portal Invitation. This email then points to it — it never
   * carries the invitation link or token itself.
   */
  invitationFollows?: boolean
  /**
   * False when no portal account is connected AND no invitation could be
   * created: the email then gives a neutral next step and promises no link.
   * Absent (older queued events) is treated as connected.
   */
  accountConnected?: boolean
}

type ContentData = Pick<GrowthProgramApprovedData, 'firstName' | 'businessName' | 'profileReleased' | 'invitationFollows' | 'accountConnected'>

export function buildGrowthProgramApprovedEmail(data: ContentData): HbeeEmailOptions & { subject: string } {
  const firstName = cleanText(data.firstName)
  const business = cleanText(data.businessName) || 'your business'
  const released = data.profileReleased === true
  const replyTo = configuredReplyTo()

  const blocks: HbeeEmailBlock[] = [
    // The decision route sends 'there' when no contact name is stored.
    { type: 'paragraph', text: firstName && firstName !== 'there' ? `Hi ${firstName},` : 'Hi,' },
    {
      type: 'paragraph',
      text: `We've completed our review of the Growth Review for ${business}, and we'd like to move forward with you.`,
    },
  ]
  if (!released && data.invitationFollows === true) {
    blocks.push(
      { type: 'heading', text: 'What happens next' },
      {
        type: 'steps',
        items: [
          "You'll receive a separate email with a secure link to set up your Hbee client portal.",
          'Sign in or create your account using that link.',
          "We'll let you know when your Growth Profile is available in your portal.",
        ],
      },
    )
  } else if (!released && data.accountConnected === false) {
    blocks.push(
      { type: 'heading', text: 'What happens next' },
      { type: 'paragraph', text: "We'll be in touch shortly with the next step, including how to access your client portal." },
    )
  } else if (released) {
    blocks.push({
      type: 'paragraph',
      text:
        'Your Growth Profile is ready in your client portal. It sets out where growth is currently ' +
        'constrained and what we recommend prioritising.',
    })
  } else {
    blocks.push(
      { type: 'heading', text: 'What happens next' },
      { type: 'paragraph', text: "We'll email you again as soon as your Growth Profile is available in your client portal." },
    )
  }
  blocks.push({
    type: 'callout',
    title: 'Good to know',
    text:
      'Your Growth Profile and its recommendations are yours to act on. Implementation is a separate, ' +
      'optional service — nothing here requires you to buy it.',
  })

  return {
    subject: released ? 'Your Growth Profile is ready' : 'Good news about your Growth Review',
    preheader: released ? 'Your Growth Profile is ready in your client portal.' : `We'd like to move forward with ${business}.`,
    status: { tone: 'approved', label: released ? 'Growth Profile ready' : 'Growth Review approved' },
    heading: released ? 'Your Growth Profile is ready.' : "We'd like to move forward.",
    blocks,
    primaryAction: released ? { label: 'Open your Growth Profile', url: '/client-portal/growth-profile' } : undefined,
    signoff: { name: 'The Hbee Digitals Team' },
    reason: "You're receiving this because you submitted a Growth Review to Hbee Digitals.",
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
  }
}

export function renderGrowthProgramApprovedEmail(data: ContentData) {
  const { subject, ...options } = buildGrowthProgramApprovedEmail(data)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendGrowthProgramApprovedEmail(data: GrowthProgramApprovedData): Promise<EmailSendResult> {
  const subject = buildGrowthProgramApprovedEmail(data).subject
  return deliver(
    'growth-program-approved',
    async () => {
      const { html, text, attachments } = renderGrowthProgramApprovedEmail(data)
      const replyTo = configuredReplyTo()
      return resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject, html, text, attachments },
        // Provider-side de-duplication, keyed on the decision itself (unchanged).
        { idempotencyKey: `growth-program-approved:${data.decisionId}` },
      )
    },
    { templateSlug: 'growth-program-approved', recipientEmail: data.email, recipientName: data.firstName, subject },
  )
}
