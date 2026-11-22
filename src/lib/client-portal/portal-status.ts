// src/lib/client-portal/portal-status.ts
//
// Pure. The portal's ONE status vocabulary for presentation: five semantic tones, and the maps from each domain's own stored or derived
// status to a tone. It adds no status, changes no workflow and reads no data: it only decides how an existing status LOOKS.
//
//   working    work is under way, nothing is asked of the client        (blue, filled dot)
//   needs-you  the client has something to do                           (orange capsule: the logo's signal insert)
//   done       finished / paid / approved                               (green check)
//   neutral    inactive, closed, expired, or simply informational       (grey ring)
//   alert      needs attention urgently (an overdue invoice)            (red triangle)
//
// The tone never stands alone: PortalStatus always prints the status words and draws a different SHAPE per tone, so colour is never the only signal.

export const PORTAL_TONES = ['working', 'needs-you', 'done', 'neutral', 'alert'] as const
export type PortalTone = (typeof PORTAL_TONES)[number]

export function isPortalTone(value: unknown): value is PortalTone {
  return typeof value === 'string' && (PORTAL_TONES as readonly string[]).includes(value)
}

/** projects-display.ts statusTone() -> portal tone. */
export function toneFromProjectTone(tone: 'info' | 'needs' | 'done' | 'muted'): PortalTone {
  return tone === 'needs' ? 'needs-you' : tone === 'done' ? 'done' : tone === 'muted' ? 'neutral' : 'working'
}

/** The DISPLAY status of an invoice (invoice-status.ts displayInvoiceStatus: overdue is derived, never stored). */
export function toneForInvoice(displayStatus: string | null | undefined): PortalTone {
  switch ((displayStatus || '').toLowerCase()) {
    case 'overdue':
      return 'alert'
    case 'issued':
    case 'partially_paid':
      return 'needs-you'
    case 'paid':
      return 'done'
    default:
      return 'neutral' // draft / void are not shown to clients; anything unknown stays calm
  }
}

export function toneForProposal(status: string | null | undefined): PortalTone {
  switch ((status || '').toLowerCase()) {
    case 'sent':
    case 'viewed':
      return 'needs-you' // awaiting the client's decision
    case 'approved':
    case 'converted':
      return 'done'
    case 'changes_requested':
      return 'working' // the ball is with Hbee
    default:
      return 'neutral' // declined, rejected, expired
  }
}

/** Request statuses as the portal shows them (request-status.ts): answered means Hbee replied and the client owes a response. */
export function toneForRequest(status: string | null | undefined): PortalTone {
  switch ((status || '').toLowerCase()) {
    case 'answered':
      return 'needs-you'
    case 'open':
    case 'in_review':
      return 'working'
    default:
      return 'neutral'
  }
}
