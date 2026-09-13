// src/lib/projects/project-status.ts
//
// The project status vocabulary, in one place.
//
// WHY IT IS NOT IN THE ROUTE. A Next.js Route Handler may export only the HTTP
// method handlers and a short list of config values; exporting a constant from
// one fails `next build` (though not `tsc --noEmit`, which is why this kind of
// mistake reaches a build and not a typecheck).
//
// THREE GROUPS OF STATUS SHARE ONE COLUMN.
//
//   PORTFOLIO — 'draft' | 'published'. `projects` is a shared table that also
//   holds the public portfolio/showcase rows, which have no client_id.
//
//   INTAKE — 'Pending Review'. What ProjectRequestForm writes when a client
//   submits a request. It is a PRE-MANAGEMENT state: a project sits here until
//   an admin takes it on. The management selector deliberately does NOT offer
//   it as a transition — nothing should move a project back into the intake
//   queue — but it is a perfectly legal stored value that the detail page must
//   be able to display and resubmit unchanged.
//
//   OPERATIONAL — the eight states the business actually works in, and what the
//   admin "Project Management" selector offers.
//
// THE CHECK CONSTRAINT WAS WIDENED; THIS LIST WAS NOT.
//
// This file previously declared that projects.status accepted ONLY
// 'draft' | 'published' | 'Pending Review', and the PATCH route refused every
// operational status with a 409 before it ever reached the database. That was
// accurate when it was written. The constraint has since been widened in
// production to admit the operational vocabulary, and leaving the application's
// copy of the rule behind meant the route kept rejecting statuses the database
// would have accepted — a status the admin selected could not be saved by any
// route in the application.
//
// The lesson the stale list teaches is in how the route now uses it: this is a
// FAST, EXPLANATORY pre-check, not the authority. The database's own CHECK
// constraint is the authority, and the route still catches 23514 and surfaces
// it, so a vocabulary that drifts again produces a clear message rather than a
// silent failure — and never a mapping onto some other legal value, which would
// record a state the admin did not choose.

/** Public portfolio rows. Not client work, and never offered by the selector. */
export const PORTFOLIO_PROJECT_STATUSES = ['draft', 'published'] as const

/** Where a client's request lands before an admin takes it on. */
export const INTAKE_PROJECT_STATUSES = ['Pending Review'] as const

/** What the admin "Project Management" selector offers as a transition. */
export const OPERATIONAL_PROJECT_STATUSES = [
  'Onboarding',
  'Assets Required',
  'In Review',
  'In Progress',
  'Awaiting Client Feedback',
  'Revision Stage',
  'Completed',
  'Archived',
] as const

/** Everything projects.status is expected to hold. */
export const PERSISTABLE_PROJECT_STATUSES = [
  ...PORTFOLIO_PROJECT_STATUSES,
  ...INTAKE_PROJECT_STATUSES,
  ...OPERATIONAL_PROJECT_STATUSES,
] as const

export type PersistableProjectStatus = (typeof PERSISTABLE_PROJECT_STATUSES)[number]

export function isPersistableProjectStatus(value: string): boolean {
  return (PERSISTABLE_PROJECT_STATUSES as readonly string[]).includes(value)
}

export function isOperationalProjectStatus(value: string): boolean {
  return (OPERATIONAL_PROJECT_STATUSES as readonly string[]).includes(value)
}

export function isIntakeProjectStatus(value: string): boolean {
  return (INTAKE_PROJECT_STATUSES as readonly string[]).includes(value)
}
