// src/lib/emails/registry.ts
//
// SERVER-ONLY. Maps a queued email_events row back to the function that sends
// it, so the retry worker can send an email long after the request that
// queued it has gone.
//
// Every entry validates its own payload before sending. A row whose payload is
// missing a required field is reported as unsendable rather than throwing
// inside the worker loop, and stops retrying instead of failing forever.
//
// Templates are imported lazily so the worker only loads the one it needs.

import type { EmailSendResult } from '@/lib/emails/layout'

if (typeof window !== 'undefined') {
  throw new Error('registry.ts is server-only and must not be imported by client code')
}

export type QueuedPayload = Record<string, unknown>

export type SendFromPayload = (payload: QueuedPayload) => Promise<EmailSendResult>

function str(payload: QueuedPayload, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const REGISTRY: Record<string, SendFromPayload> = {
  'assessment-received': async (payload) => {
    const firstName = str(payload, 'firstName')
    const email = str(payload, 'email')
    const assessmentId = str(payload, 'assessmentId')
    if (!firstName || !email || !assessmentId) {
      return { ok: false, outcome: 'failed', reason: 'payload_incomplete' }
    }
    const { sendAssessmentReceivedEmail } = await import('@/lib/emails/hos/assessment-received')
    return sendAssessmentReceivedEmail({
      firstName,
      email,
      assessmentId,
      portalUrl: str(payload, 'portalUrl') || '/client-signup',
    })
  },

  'admin-growth-assessment': async (payload) => {
    const contactName = str(payload, 'contactName')
    const businessName = str(payload, 'businessName')
    const email = str(payload, 'email')
    if (!contactName || !businessName || !email) {
      return { ok: false, outcome: 'failed', reason: 'payload_incomplete' }
    }
    const { sendAdminGrowthAssessmentNotification } = await import(
      '@/lib/emails/admin-growth-assessment-notification'
    )
    return sendAdminGrowthAssessmentNotification(
      contactName,
      businessName,
      email,
      str(payload, 'assessmentId') || undefined,
    )
  },

  'onboarding-confirmation': async (payload) => {
    const fullName = str(payload, 'fullName')
    const email = str(payload, 'email')
    const projectId = str(payload, 'projectId')
    if (!fullName || !email || !projectId) {
      return { ok: false, outcome: 'failed', reason: 'payload_incomplete' }
    }
    const { sendOnboardingConfirmation } = await import('@/lib/emails/onboarding-confirmation')
    return sendOnboardingConfirmation(fullName, email, projectId)
  },

  'admin-onboarding': async (payload) => {
    const fullName = str(payload, 'fullName')
    const businessName = str(payload, 'businessName')
    const email = str(payload, 'email')
    const projectId = str(payload, 'projectId')
    if (!fullName || !businessName || !email || !projectId) {
      return { ok: false, outcome: 'failed', reason: 'payload_incomplete' }
    }
    const { sendAdminOnboardingNotification } = await import(
      '@/lib/emails/admin-onboarding-notification'
    )
    return sendAdminOnboardingNotification(fullName, businessName, email, projectId)
  },
}

export function isKnownTemplate(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGISTRY, slug)
}

export function senderFor(slug: string): SendFromPayload | null {
  return REGISTRY[slug] ?? null
}

/** Reasons that will never succeed on a retry, so the worker stops early. */
export const PERMANENT_REASONS = new Set(['payload_incomplete', 'unknown_template'])
