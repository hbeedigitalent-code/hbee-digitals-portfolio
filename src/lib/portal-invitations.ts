// src/lib/portal-invitations.ts
//
// SERVER-ONLY. Portal invitations (Phase 16.6): the deliberate step that lets a
// reviewed merchant create / sign in to a portal account and have it linked to
// THEIR merchant record — without the receipt-stage signup CTA, without email
// matching, and without trusting any id from a browser.
//
// THE FOUR CONCEPTS ARE KEPT APART
//   decision   growth_program_decisions (record_program_decision) — unchanged
//   invitation portal_invitations — this module issues them
//   linkage    consume_portal_invitation() — the only invitation-based linker
//   release    growth_program_decisions + GROWTH_PROFILE_RELEASE_ENABLED, read by
//              /api/client-portal/growth-profile — unchanged
//
// TOKENS
//   token = base64url(HMAC-SHA256(subkey, invitationId)), subkey derived from the
//   DEDICATED server-only secret PORTAL_INVITATION_SECRET with a fixed label.
//   It is never derived from the Supabase service-role key. So:
//     * the token is unguessable without that secret;
//     * the database stores ONLY sha256(token) — a leaked table yields no tokens;
//     * the outbox payload carries only the invitation id (the outbox rule is
//       "no secrets in payloads"); the email sender recomputes the token;
//     * FAIL CLOSED: with the secret missing or too short, no invitation is
//       issued, no invitation email is sent, and no token is accepted;
//     * rotating the secret invalidates outstanding invitations (they fail
//       safely as "invalid"; re-issue from admin).

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto'

if (typeof window !== 'undefined') {
  throw new Error('portal-invitations.ts is server-only and must not be imported by client code')
}

export const INVITE_TTL_DAYS = 14
export const INVITE_COOKIE = 'hb_portal_invite'
export const INVITE_TEMPLATE = 'portal-invitation'

/** A token is 43 base64url characters (32-byte HMAC). Anything else is rejected before any lookup. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** Minimum accepted secret length: 32 random bytes encode to ≥ 43 base64 / 64 hex characters. */
export const MIN_SECRET_LENGTH = 43

/** True only when a usable dedicated secret is configured. */
export function invitationSecretConfigured(): boolean {
  return subkey() !== null
}

function subkey(): Buffer | null {
  const secret = process.env.PORTAL_INVITATION_SECRET?.trim()
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null
  return createHmac('sha256', secret).update('hbee-portal-invitation-token-v1').digest()
}

/** The token for an invitation id, or null when the server secret is unavailable. */
export function invitationToken(invitationId: string): string | null {
  const key = subkey()
  if (!key) return null
  return createHmac('sha256', key).update(invitationId).digest('base64url')
}

/** What is stored and looked up: lowercase hex SHA-256 of the token. */
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison helper for tests / defence in depth. */
export function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** The outbox key for an invitation's email: one email per invitation, retries collapse. */
export function invitationEventKey(invitationId: string): string {
  return `${INVITE_TEMPLATE}:${invitationId}`
}

export type IssueOutcome =
  | {
      ok: true
      state: 'issued' | 'existing'
      invitationId: string
      eventKey: string
      expiresAt: string
      /** Queues (and attempts) the Portal Invitation email. Idempotent on eventKey. */
      queueEmail: () => Promise<boolean>
      /** Whether this call queued the email (false when deferred via options.deferEmail). */
      emailQueued: boolean
    }
  | { ok: true; state: 'already_linked' }
  | { ok: false; reason: 'no_merchant' | 'merchant_email_unavailable' | 'client_link_ambiguous' | 'server_configuration' | 'write_failed' }

/**
 * Issue (or reuse) the open invitation for a merchant and queue its email.
 *
 * Idempotent: at most one open invitation per merchant (partial unique index).
 * A second call returns the existing one and re-attempts delivery of its SAME
 * outbox event, which the outbox de-duplicates — so a double click or a retry
 * never sends a second, different link.
 *
 * Refuses when the merchant already has a linked portal account (nothing to
 * invite) or more than one (ambiguous — a human resolves it).
 */
export async function issuePortalInvitation(
  db: any,
  input: { merchantId: string; actorId: string; assessmentId?: string | null },
  /**
   * deferEmail: create/reuse the invitation but do NOT queue its email yet; the
   * caller queues it (queueEmail) after the decision email, so the Approved
   * email can truthfully say an invitation follows.
   */
  options: { deferEmail?: boolean } = {},
): Promise<IssueOutcome> {
  if (!subkey()) return { ok: false, reason: 'server_configuration' }

  const { data: merchant, error: merchantError } = await db
    .from('merchants')
    .select('id, email, contact_name, business_name')
    .eq('id', input.merchantId)
    .maybeSingle()
  if (merchantError || !merchant) return { ok: false, reason: 'no_merchant' }

  const email = typeof merchant.email === 'string' ? merchant.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) return { ok: false, reason: 'merchant_email_unavailable' }

  const { data: linked, error: linkedError } = await db
    .from('clients')
    .select('id')
    .eq('merchant_id', input.merchantId)
    .limit(2)
  if (linkedError) return { ok: false, reason: 'write_failed' }
  if (linked && linked.length > 1) return { ok: false, reason: 'client_link_ambiguous' }
  if (linked && linked.length === 1) return { ok: true, state: 'already_linked' }

  // Reuse an open, unexpired invitation.
  const now = new Date()
  const { data: open } = await db
    .from('portal_invitations')
    .select('id, expires_at, email')
    .eq('merchant_id', input.merchantId)
    .is('consumed_at', null)
    .is('revoked_at', null)
    .maybeSingle()

  let invitationId: string
  let expiresAt: string
  let state: 'issued' | 'existing'

  if (open && new Date(open.expires_at) > now && open.email === email) {
    invitationId = open.id
    expiresAt = open.expires_at
    state = 'existing'
  } else {
    if (open) {
      // Expired, or the merchant's address changed: retire it before issuing anew.
      const { error: revokeError } = await db
        .from('portal_invitations')
        .update({ revoked_at: now.toISOString() })
        .eq('id', open.id)
        .is('consumed_at', null)
      if (revokeError) return { ok: false, reason: 'write_failed' }
    }

    invitationId = randomUUID()
    const token = invitationToken(invitationId)!
    expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000).toISOString()
    const { error: insertError } = await db.from('portal_invitations').insert({
      id: invitationId,
      merchant_id: input.merchantId,
      email,
      token_hash: tokenHash(token),
      assessment_id: input.assessmentId ?? null,
      created_by: input.actorId,
      expires_at: expiresAt,
    })
    if (insertError) {
      // A concurrent issue won the one-open-per-merchant index: converge on it.
      if ((insertError as { code?: string }).code === '23505') {
        const { data: winner } = await db
          .from('portal_invitations')
          .select('id, expires_at')
          .eq('merchant_id', input.merchantId)
          .is('consumed_at', null)
          .is('revoked_at', null)
          .maybeSingle()
        if (!winner) return { ok: false, reason: 'write_failed' }
        invitationId = winner.id
        expiresAt = winner.expires_at
        state = 'existing'
      } else {
        return { ok: false, reason: 'write_failed' }
      }
    } else {
      state = 'issued'
    }
  }

  const contactName = typeof merchant.contact_name === 'string' ? merchant.contact_name.trim() : ''
  const businessName = typeof merchant.business_name === 'string' ? merchant.business_name.trim() : ''
  const eventKey = invitationEventKey(invitationId)

  const queueEmail = async (): Promise<boolean> => {
    const { enqueueEmail, deliverQueuedEvent } = await import('@/lib/emails/outbox')
    const queued = await enqueueEmail({
      eventKey,
      templateSlug: INVITE_TEMPLATE,
      recipientEmail: email,
      recipientName: contactName || null,
      // No token here — the sender recomputes it from the id.
      payload: {
        firstName: contactName ? contactName.split(/\s+/)[0] : '',
        email,
        businessName,
        invitationId,
        expiresAt,
      },
    })
    if (!queued.ok) {
      console.error(`[portal-invitation] email not queued for invitation ${invitationId}: ${queued.reason}`)
      return false
    }
    if (!queued.duplicate) await deliverQueuedEvent(eventKey).catch(() => undefined)
    return true
  }

  const emailQueued = options.deferEmail ? false : await queueEmail()
  return { ok: true, state, invitationId, eventKey, expiresAt, queueEmail, emailQueued }
}

export type InvitationView =
  | { state: 'valid'; businessName: string | null; email: string }
  | { state: 'invalid' }
  | { state: 'expired' }
  | { state: 'used' }

/**
 * Read-only state of a presented token, for the invitation page. Never links,
 * never reveals ids. A consumed invitation reads as 'used' here; the accept
 * call distinguishes "used by you" (safe success) from "used by someone else".
 */
export async function viewInvitation(db: any, token: string): Promise<InvitationView> {
  if (!subkey() || !TOKEN_RE.test(token)) return { state: 'invalid' }
  const { data: inv } = await db
    .from('portal_invitations')
    .select('email, expires_at, consumed_at, revoked_at, merchants(business_name)')
    .eq('token_hash', tokenHash(token))
    .maybeSingle()
  if (!inv || inv.revoked_at) return { state: 'invalid' }
  if (inv.consumed_at) return { state: 'used' }
  if (new Date(inv.expires_at) <= new Date()) return { state: 'expired' }
  const m = Array.isArray(inv.merchants) ? inv.merchants[0] : inv.merchants
  return { state: 'valid', businessName: m?.business_name ?? null, email: inv.email }
}

export type ConsumeReason =
  | 'linked'
  | 'already_linked'
  | 'invalid'
  | 'expired'
  | 'used'
  | 'email_mismatch'
  | 'no_client'
  | 'client_ambiguous'
  | 'client_linked_elsewhere'
  | 'merchant_linked_elsewhere'
  | 'link_refused'

/** Consume a token for a VERIFIED, signed-in user. Linking happens only inside the database function. */
export async function consumeInvitation(
  db: any,
  input: { token: string; userId: string; verifiedEmail: string },
): Promise<{ ok: boolean; reason: ConsumeReason | 'error' }> {
  if (!subkey() || !TOKEN_RE.test(input.token)) return { ok: false, reason: 'invalid' }
  const { data, error } = await db.rpc('consume_portal_invitation', {
    p_token_hash: tokenHash(input.token),
    p_user_id: input.userId,
    p_user_email: input.verifiedEmail,
  })
  if (error || !data) {
    console.error(`[portal-invitation] consume failed (code=${(error as { code?: string })?.code ?? 'n/a'})`)
    return { ok: false, reason: 'error' }
  }
  return { ok: data.ok === true, reason: String(data.reason) as ConsumeReason }
}
