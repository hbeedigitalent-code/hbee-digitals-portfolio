// src/lib/emails/admin-onboarding-notification.ts
//
// Internal notification, sent from POST /api/onboarding alongside the client's
// confirmation. Trigger, signature, recipient resolution and the "skip quietly
// when Resend is unconfigured" behaviour are unchanged.
//
// Rebuilt on the shared branded layout. Carries identifying details and a link
// into the admin area only — no submitted answers, files or notes by email.

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

export async function sendAdminOnboardingNotification(
  fullName: string,
  businessName: string,
  email: string,
  projectId: string
): Promise<EmailSendResult> {
  if (!resend) {
    console.warn('Resend API key not configured - skipping admin email')
    return { ok: false, outcome: 'skipped', reason: 'resend_not_configured' }
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com'

  const blocks: EmailBlock[] = [
    {
      type: 'paragraph',
      text: 'A client has completed the onboarding form.',
    },
    {
      type: 'facts',
      rows: [
        { label: 'Project reference', value: projectId || '—' },
        { label: 'Business', value: businessName || '—' },
        { label: 'Contact', value: fullName || '—' },
        { label: 'Email', value: email || '—' },
        { label: 'Submitted', value: new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC' },
      ],
    },
    {
      type: 'callout',
      title: 'Submitted details are not included',
      text:
        'Open the submission in the admin area to see the answers and any uploaded ' +
        'files. Nothing beyond the summary above is sent by email.',
    },
  ]

  return deliver('admin-onboarding', async () => {
    const { html, text } = renderEmail({
      preheader: `New onboarding submission ${projectId} from ${businessName || 'a client'}.`,
      eyebrow: 'Internal notification',
      heading: 'New onboarding submission',
      blocks,
      cta: { label: 'Open onboarding submissions', url: '/admin/client-onboarding' },
      reason:
        'You are receiving this because you are listed as an Hbee Digitals admin recipient.',
      supportEmail: supportEmail(),
    })

    // Returned, not awaited-and-discarded: deliver() inspects the provider
    // envelope, because the Resend SDK RESOLVES with { error } on rejection.
    return resend.emails.send(
      {
        from: emailFrom(),
        ...emailReplyTo(),
        to: adminEmail,
        subject: `New onboarding submission — ${projectId}`,
        html,
        text,
      },
      // Provider-side idempotency. Resend de-duplicates on this key, so a
      // retry of the same logical send cannot deliver a second copy. Its
      // window is the provider's, not ours (Resend documents 24 hours), so
      // it protects against a retry storm — NOT against a resend days later.
      { idempotencyKey: `admin-onboarding:${projectId}` },
    )
  }, {
    templateSlug: 'admin-onboarding',
    recipientEmail: adminEmail,
    recipientName: 'Hbee Digitals admin',
    subject: `New onboarding submission — ${projectId}`,
  },
  )
}
