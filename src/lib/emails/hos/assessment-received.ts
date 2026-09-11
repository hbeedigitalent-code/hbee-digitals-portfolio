// src/lib/emails/hos/assessment-received.ts
//
// Sent once, from POST /api/growth-assessment, immediately after a submission
// is stored. Trigger and function contract are unchanged.
//
// Rebuilt on the shared branded layout (src/lib/emails/layout.ts). Three
// factual corrections came with that, all of which contradicted the confirmed
// program terms:
//
//   1. "Over the next 12-48 hours" — an invented turnaround. No review time has
//      been committed to, so none is stated.
//   2. A six-step "HOS Journey" tracker ending in Strategy / Proposal /
//      Onboarding, which presented a paid engagement as the expected path.
//   3. Copy that read as though the review outcome were a formality. Submission
//      is an application; approval is a separate, deliberate decision.

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

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailData {
  firstName: string
  email: string
  assessmentId: string
  portalUrl: string
}

export async function sendAssessmentReceivedEmail(data: EmailData): Promise<EmailSendResult> {
  const blocks: EmailBlock[] = [
    { type: 'paragraph', text: `Hi ${data.firstName},` },
    {
      type: 'paragraph',
      text:
        'Thank you for completing the Hbee Digitals Growth Readiness Assessment. ' +
        'Your submission has been received and is now with our team.',
    },
    {
      type: 'reference',
      label: 'Your assessment reference',
      value: data.assessmentId,
    },
    { type: 'heading', text: 'What happens next' },
    {
      type: 'paragraph',
      text:
        'A member of the Hbee team reviews your answers and your store, and looks at ' +
        'where your growth is currently constrained.',
    },
    {
      type: 'list',
      items: [
        'Your current growth stage and priorities',
        'How you attract and convert customers today',
        'Your website and customer experience',
        'Trust, retention and conversion opportunities',
        'Readiness to implement changes',
      ],
    },
    {
      type: 'callout',
      title: 'Submitting is an application, not an approval',
      text:
        'Receiving this email confirms we have your assessment. It does not mean you ' +
        'have been approved for the growth support programme. We will write to you ' +
        'again once a decision has been made.',
    },
    { type: 'heading', text: 'Set up your client portal' },
    {
      type: 'paragraph',
      text:
        'You can create your secure client portal account now. Your Growth Profile ' +
        'appears there if your application is approved.',
    },
  ]

  // Rendering is INSIDE deliver(): building the links is what can raise a
  // configuration error, and that must be reported, not thrown at the caller.
  // The assessment itself is already stored by this point and stays stored.
  return deliver('assessment-received', async () => {
    const { html, text } = renderEmail({
      preheader: 'We have your assessment. Here is what happens next.',
      eyebrow: 'Assessment received',
      heading: "We've received your Growth Readiness Assessment",
      blocks,
      cta: { label: 'Create your portal account', url: data.portalUrl },
      signoff: { name: 'Habeeb Ismaila', title: 'CEO & Founder, Hbee Digitals' },
      reason:
        'You are receiving this because you submitted the Growth Readiness Assessment at hbeedigitals.com.',
      supportEmail: supportEmail(),
    })

    // Returned, not awaited-and-discarded: deliver() inspects the provider
    // envelope, because the Resend SDK RESOLVES with { error } on rejection.
    return resend.emails.send(
      {
        from: emailFrom(),
        ...emailReplyTo(),
        to: data.email,
        subject: "We've received your Growth Readiness Assessment",
        html,
        text,
      },
      // Provider-side idempotency. Resend de-duplicates on this key, so a
      // retry of the same logical send cannot deliver a second copy. Its
      // window is the provider's, not ours (Resend documents 24 hours), so
      // it protects against a retry storm — NOT against a resend days later.
      { idempotencyKey: `assessment-received:${data.assessmentId}` },
    )
  }, {
    templateSlug: 'assessment-received',
    recipientEmail: data.email,
    recipientName: data.firstName,
    subject: "We've received your Growth Readiness Assessment",
  },
  )
}
