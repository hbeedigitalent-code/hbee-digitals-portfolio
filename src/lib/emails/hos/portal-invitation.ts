// src/lib/emails/hos/portal-invitation.ts
//
// The Portal Invitation (Phase 16.6). Queued ONLY by issuePortalInvitation()
// (src/lib/portal-invitations.ts) after an admin deliberately invites a
// reviewed merchant. Never sent at receipt.
//
// The link carries the invitation token, recomputed here from the invitation id
// (the outbox payload holds no secrets). The link only sets a cookie and shows
// the invitation page; connecting requires a signed-in, verified account whose
// email matches the invited address. No internal id is rendered.

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, EmailConfigurationError, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailOptions } from '@/lib/emails/hbee-email'
import { invitationToken } from '@/lib/portal-invitations'

const resend = new Resend(process.env.RESEND_API_KEY)

export const PORTAL_INVITATION_SUBJECT = 'Your invitation to the Hbee client portal'

export interface PortalInvitationData {
  firstName: string
  email: string
  businessName: string
  /** Idempotency and token derivation only — never rendered. */
  invitationId: string
  expiresAt: string
}

function expiryText(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function buildPortalInvitationEmail(
  data: Pick<PortalInvitationData, 'firstName' | 'email' | 'businessName' | 'expiresAt'>,
  token: string,
): HbeeEmailOptions & { subject: string } {
  const firstName = cleanText(data.firstName)
  const business = cleanText(data.businessName)
  const email = cleanText(data.email)
  const expires = expiryText(data.expiresAt)
  const replyTo = configuredReplyTo()

  return {
    subject: PORTAL_INVITATION_SUBJECT,
    preheader: business ? `Connect your client portal account for ${business}.` : 'Connect your Hbee client portal account.',
    status: { tone: 'review', label: 'Portal invitation' },
    heading: "You're invited to the Hbee client portal.",
    blocks: [
      { type: 'paragraph', text: firstName ? `Hi ${firstName},` : 'Hi,' },
      {
        type: 'paragraph',
        text:
          `Following your Growth Review${business ? ` for ${business}` : ''}, we'd like to give you access to your ` +
          "Hbee client portal — where we'll share your Growth Profile and updates when they're ready.",
      },
      { type: 'heading', text: 'How to connect' },
      {
        type: 'steps',
        items: [
          'Open your invitation using the button below.',
          `Sign in, or create an account, with ${email}.`,
          'Confirm the connection.',
        ],
      },
      {
        type: 'callout',
        title: 'Good to know',
        text:
          `This invitation is personal to you${expires ? ` and expires on ${expires}` : ''}. ` +
          `Use the email address it was sent to (${email}). Accepting it doesn't commit you to anything.`,
      },
    ],
    primaryAction: { label: 'Accept your invitation', url: `/api/portal-invitation/open?token=${encodeURIComponent(token)}` },
    signoff: { name: 'The Hbee Digitals Team' },
    reason: "You're receiving this because Hbee invited you to the client portal after reviewing your Growth Review.",
    supportEmail: replyTo?.address ?? supportEmail(),
    repliesMonitored: replyTo !== null,
  }
}

export function renderPortalInvitationEmail(
  data: Pick<PortalInvitationData, 'firstName' | 'email' | 'businessName' | 'expiresAt'>,
  token: string,
) {
  const { subject, ...options } = buildPortalInvitationEmail(data, token)
  return { subject, ...renderHbeeEmail(options) }
}

export async function sendPortalInvitationEmail(data: PortalInvitationData): Promise<EmailSendResult> {
  return deliver(
    'portal-invitation',
    async () => {
      const token = invitationToken(data.invitationId)
      if (!token) {
        throw new EmailConfigurationError('invitation_secret_missing', 'The invitation token cannot be derived on this server.')
      }
      const { html, text } = renderPortalInvitationEmail(data, token)
      const replyTo = configuredReplyTo()
      return resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: data.email, subject: PORTAL_INVITATION_SUBJECT, html, text },
        { idempotencyKey: `portal-invitation:${data.invitationId}` },
      )
    },
    { templateSlug: 'portal-invitation', recipientEmail: data.email, recipientName: data.firstName, subject: PORTAL_INVITATION_SUBJECT },
  )
}
