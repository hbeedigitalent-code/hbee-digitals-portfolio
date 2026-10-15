// src/lib/portal-invitation-state.ts
//
// What the admin decision panel is told about a merchant's portal invitation, and how it reads that state.
//
// Pure and import-free so the SERVER builds the summary and the BROWSER panel derives its wording from the same
// definition. It is deliberately NOT the module that issues invitations (portal-invitations.ts, server-only).
//
// SECRETS: the summary is built from a WHITELIST of columns. The invitation id is not included, and neither is
// token_hash or anything derived from a token; a row that carries them has them dropped here, not by the caller.

export type InvitationLifecycle = 'none' | 'open' | 'consumed' | 'expired' | 'revoked'

/** The invitation email's delivery state, from the outbox row for that invitation (never inferred). */
export type InvitationEmailStatus = 'sent' | 'pending' | 'failed' | 'unknown'

export interface InvitationSummary {
  state: InvitationLifecycle
  /** The address the invitation was issued to. */
  email: string | null
  created_at: string | null
  expires_at: string | null
  consumed_at: string | null
  revoked_at: string | null
  email_status: InvitationEmailStatus
}

export const NO_INVITATION: InvitationSummary = {
  state: 'none',
  email: null,
  created_at: null,
  expires_at: null,
  consumed_at: null,
  revoked_at: null,
  email_status: 'unknown',
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** Map the outbox status to what is safe to say. 'dead' and 'failed' both mean "not delivered". */
export function emailStatusFromOutbox(status: unknown): InvitationEmailStatus {
  if (status === 'sent') return 'sent'
  if (status === 'pending' || status === 'processing') return 'pending'
  if (status === 'failed' || status === 'dead') return 'failed'
  return 'unknown'
}

/**
 * Build the browser-safe summary from a portal_invitations row (the latest for the merchant) and the outbox status of
 * its email. Whitelist only; unknown or secret-bearing columns on the row are never copied.
 */
export function summariseInvitation(
  row: Record<string, unknown> | null | undefined,
  emailStatus: InvitationEmailStatus = 'unknown',
  now: Date = new Date(),
): InvitationSummary {
  if (!row) return NO_INVITATION
  const consumed = str(row.consumed_at)
  const revoked = str(row.revoked_at)
  const expires = str(row.expires_at)
  const expiresMs = expires ? Date.parse(expires) : NaN

  let state: InvitationLifecycle
  if (consumed) state = 'consumed'
  else if (revoked) state = 'revoked'
  else if (Number.isFinite(expiresMs) && expiresMs <= now.getTime()) state = 'expired'
  else state = 'open'

  return {
    state,
    email: str(row.email),
    created_at: str(row.created_at),
    expires_at: expires,
    consumed_at: consumed,
    revoked_at: revoked,
    email_status: emailStatus,
  }
}

export type ClientLinkState = 'no_merchant' | 'no_client' | 'ambiguous' | 'linked' | undefined

export type InvitationPanelMode =
  /** A portal account is linked: no invitation action of any kind. */
  | 'linked'
  /** No linked account and an open, unexpired invitation: show it as sent. No initial-send action. */
  | 'invitation_open'
  /** No linked account, and the previous invitation expired or was revoked: the safe send-new path. */
  | 'send_new'
  /** No linked account and no invitation has ever been issued: the initial send action. */
  | 'send_first'
  /** Nothing to invite (no merchant / more than one linked client). */
  | 'unavailable'

export function invitationPanelMode(clientState: ClientLinkState, invitation: InvitationSummary | null | undefined): InvitationPanelMode {
  if (clientState === 'linked') return 'linked'
  if (clientState !== 'no_client') return 'unavailable'
  const state = invitation?.state ?? 'none'
  if (state === 'open') return 'invitation_open'
  if (state === 'expired' || state === 'revoked') return 'send_new'
  // 'consumed' with no linked client cannot be explained by an invitation; fall back to the normal send path.
  return 'send_first'
}

/** A short, neutral date, or null when the value is missing or not a real date (never "Invalid Date"). */
export function shortDate(value: string | null | undefined): string | null {
  if (!value) return null
  const t = Date.parse(value)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
