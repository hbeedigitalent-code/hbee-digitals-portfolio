// src/components/admin/PortalInvitationBlock.tsx
//
// The "invite the merchant to the client portal" area of the programme decision panel, as a pure presentational
// component so each state can be rendered and tested without a browser or a network.
//
// It shows what the SERVER says about the invitation (portal_invitations, summarised in
// portal-invitation-state.ts). It never infers "sent" from the browser, and it offers the initial-send action ONLY
// when no usable invitation exists. When one is open it is shown as sent, with no send button: the invite endpoint is
// idempotent (one open invitation per merchant, the same outbox email), so a second click could not send anything new.

import {
  invitationPanelMode,
  shortDate,
  type ClientLinkState,
  type InvitationSummary,
} from '@/lib/portal-invitation-state'

interface Props {
  clientState: ClientLinkState
  invitation: InvitationSummary | null | undefined
  busy: boolean
  onSend: () => void
}

const BUTTON =
  'rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]'

export default function PortalInvitationBlock({ clientState, invitation, busy, onSend }: Props) {
  const mode = invitationPanelMode(clientState, invitation)

  if (mode === 'linked' || mode === 'unavailable') return null

  if (mode === 'invitation_open') {
    const expires = shortDate(invitation?.expires_at)
    const email = invitation?.email
    const emailStatus = invitation?.email_status
    return (
      <div className="space-y-2 rounded-lg border border-[var(--border)] p-3" data-invitation-state="open">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Portal invitation sent</p>
        {email && <p className="text-xs text-[var(--text-secondary)]">Sent to {email}</p>}
        {expires && <p className="text-xs text-[var(--text-secondary)]">Expires {expires}</p>}
        {emailStatus === 'pending' && (
          <p className="text-xs text-[var(--warning)]">The invitation exists and its email is still being delivered.</p>
        )}
        {emailStatus === 'failed' && (
          <p className="text-xs text-[var(--warning)]">The invitation exists, but its email has not been confirmed as delivered.</p>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          The merchant&apos;s account connects when they accept it signed in with that address. The programme decision can
          be recorded in the meantime.
        </p>
      </div>
    )
  }

  const reissue = mode === 'send_new'
  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] p-3" data-invitation-state={reissue ? 'send_new' : 'none'}>
      <p className="text-xs font-medium text-[var(--text-muted)]">Invite the merchant to the client portal</p>
      {reissue && (
        <p className="text-xs text-[var(--text-secondary)]">
          The previous invitation {invitation?.state === 'revoked' ? 'was revoked' : 'has expired'}.
        </p>
      )}
      <button type="button" onClick={onSend} disabled={busy} className={BUTTON}>
        {busy ? 'Sending…' : reissue ? 'Send a new portal invitation' : 'Send portal invitation'}
      </button>
      <p className="text-xs text-[var(--text-muted)]">
        Emails a personal link to the merchant&apos;s address. Their account is connected only when they accept it signed in
        with that address. Once connected, record the decision.
      </p>
    </div>
  )
}
