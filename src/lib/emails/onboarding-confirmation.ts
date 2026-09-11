// src/lib/emails/onboarding-confirmation.ts
//
// Sent from POST /api/onboarding to the client who completed the onboarding
// form. Trigger, signature and the "skip quietly when Resend is unconfigured"
// behaviour are unchanged.
//
// Rebuilt on the shared branded layout. This is the ORDINARY CLIENT ONBOARDING
// path and is deliberately independent of the growth programme: nothing here
// mentions assessments, approval or a Growth Profile.

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

// Only initialize Resend if API key exists
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendOnboardingConfirmation(
  fullName: string,
  email: string,
  projectId: string
): Promise<EmailSendResult> {
  if (!resend) {
    console.warn('Resend API key not configured - skipping email send')
    return { ok: false, outcome: 'skipped', reason: 'resend_not_configured' }
  }

  const blocks: EmailBlock[] = [
    { type: 'paragraph', text: `Hi ${fullName},` },
    {
      type: 'paragraph',
      text:
        'Thank you for completing your onboarding with Hbee Digitals. Your project ' +
        'details, files and requirements have been received.',
    },
    {
      type: 'reference',
      label: 'Your project reference',
      value: projectId,
    },
    { type: 'heading', text: 'What happens next' },
    {
      type: 'list',
      items: [
        'Our team reviews everything you submitted.',
        'We come back to you with any clarifying questions.',
        'You can track progress and share files in your client portal.',
      ],
    },
    {
      type: 'paragraph',
      text: 'Keep your project reference to hand when you get in touch about this project.',
      muted: true,
    },
  ]

  return deliver('onboarding-confirmation', async () => {
    const { html, text } = renderEmail({
      preheader: `We have your project details. Reference ${projectId}.`,
      eyebrow: 'Onboarding received',
      heading: 'Your project details have been received',
      blocks,
      cta: { label: 'Open your client portal', url: '/client-portal' },
      signoff: { name: 'The Hbee Digitals Team', title: 'Hbee Digitals' },
      reason:
        'You are receiving this because you completed the onboarding form at hbeedigitals.com.',
      supportEmail: supportEmail(),
    })

    // Returned, not awaited-and-discarded: deliver() inspects the provider
    // envelope, because the Resend SDK RESOLVES with { error } on rejection.
    return resend.emails.send(
      {
        from: emailFrom(),
        ...emailReplyTo(),
        to: email,
        subject: `Project details received — ${projectId}`,
        html,
        text,
      },
      // Provider-side idempotency. Resend de-duplicates on this key, so a
      // retry of the same logical send cannot deliver a second copy. Its
      // window is the provider's, not ours (Resend documents 24 hours), so
      // it protects against a retry storm — NOT against a resend days later.
      { idempotencyKey: `onboarding-confirmation:${projectId}` },
    )
  }, {
    templateSlug: 'onboarding-confirmation',
    recipientEmail: email,
    recipientName: fullName,
    subject: `Project details received — ${projectId}`,
  },
  )
}
