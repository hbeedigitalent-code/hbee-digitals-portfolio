// src/lib/projects/project-status.ts
//
// The project status vocabulary, in one place.
//
// WHY IT IS NOT IN THE ROUTE. A Next.js Route Handler may export only the HTTP
// method handlers and a short list of config values; exporting a constant from
// one fails `next build` (though not `tsc --noEmit`, which is why this kind of
// mistake reaches a build and not a typecheck).
//
// TWO VOCABULARIES EXIST, AND THEY DO NOT MATCH.
//
//   PERSISTABLE — what projects.status actually accepts. The column carries a
//   CHECK constraint permitting only these three values. Anything else raises
//   23514 check_violation.
//
//   OPERATIONAL — what the admin "Project Management" selector offers. These
//   are the states the business actually works in, and NONE of them is
//   currently persistable.
//
// That gap is the live defect: an admin picks "In Progress", the UPDATE is
// rejected by the constraint, and the page discards the error. Nothing in this
// application maps a chosen operational status onto a legal one — that would
// silently record a state the admin did not choose. Widening the constraint is
// a reviewed migration.

export const PERSISTABLE_PROJECT_STATUSES = ['draft', 'published', 'Pending Review'] as const

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

export type PersistableProjectStatus = (typeof PERSISTABLE_PROJECT_STATUSES)[number]

export function isPersistableProjectStatus(value: string): boolean {
  return (PERSISTABLE_PROJECT_STATUSES as readonly string[]).includes(value)
}

export function isOperationalProjectStatus(value: string): boolean {
  return (OPERATIONAL_PROJECT_STATUSES as readonly string[]).includes(value)
}
