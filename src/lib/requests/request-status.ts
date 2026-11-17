// src/lib/requests/request-status.ts
//
// The request status model, in one pure place (no I/O, importable from server AND client code).
//
//   open        submitted or re-opened; Hbee owes a response
//   in_review   Hbee has picked it up
//   answered    Hbee replied; the client owes a response (or confirmation)
//   closed      resolved
//
// The authority for transitions is the database (set_request_status / post_request_message in
// scripts/requests-projects-01-forward.sql). This module is the SAME rule set for the UI and the tests, and
// normalizeRequestStatus mirrors hbee_request_status() so the legacy values already in project_requests.status
// map to the same canonical value in the browser as in the database.

export const REQUEST_STATUSES = ['open', 'in_review', 'answered', 'closed'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  answered: 'Answered',
  closed: 'Closed',
}

/** What the CLIENT is told about each state (their next step, not Hbee's internal phrase). */
export const CLIENT_STATUS_HINTS: Record<RequestStatus, string> = {
  open: 'Hbee has received this and will respond.',
  in_review: 'Hbee is reviewing this request.',
  answered: 'Hbee has replied. Reply back, or mark it resolved.',
  closed: 'This request is resolved.',
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value)
}

/** Mirrors public.hbee_request_status(): unknown or empty historical values read as 'open'. */
export function normalizeRequestStatus(raw: unknown): RequestStatus {
  switch (typeof raw === 'string' ? raw.trim().toLowerCase() : '') {
    case 'in_review':
    case 'in review':
    case 'under review':
    case 'in progress':
    case 'in_progress':
    case 'reviewing':
      return 'in_review'
    case 'answered':
    case 'responded':
    case 'replied':
      return 'answered'
    case 'closed':
    case 'resolved':
    case 'completed':
    case 'done':
      return 'closed'
    default:
      return 'open'
  }
}

export type Actor = 'client' | 'admin'

/**
 * May `actor` move a request from `from` to `to` by an explicit status action?
 *   admin  any change among the four states (including re-opening a closed request)
 *   client only answered -> closed ("this is resolved")
 */
export function canChangeStatus(actor: Actor, from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return false
  if (actor === 'admin') return true
  return from === 'answered' && to === 'closed'
}

/**
 * The status a request lands in after a MESSAGE, or null when the message is not allowed at all.
 *   internal note         never changes status; allowed on any request
 *   admin reply           open / in_review -> answered; answered stays; closed is refused (re-open first)
 *   client reply          answered -> open (it is Hbee's turn again); open / in_review stay; closed is refused
 */
export function statusAfterMessage(actor: Actor, from: RequestStatus, internal: boolean): RequestStatus | null {
  if (internal) return actor === 'admin' ? from : null
  if (from === 'closed') return null
  if (actor === 'admin') return 'answered'
  return from === 'answered' ? 'open' : from
}
