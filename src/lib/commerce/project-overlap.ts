// src/lib/commerce/project-overlap.ts
//
// Pure. The duplicate-project awareness shown to Admin while a proposal is being created.
//
// THE FACT THIS REFLECTS. A client request creates a "Pending Review" project at submit time. When the client later APPROVES a
// proposal, the database creates a project for it, because a proposal can only be linked to a project AFTER it is approved (the
// proposals_immutable_after_decision trigger refuses to link a draft or a sent proposal, and never re-links). So Admin cannot
// attach an existing project in advance, and approval cannot be changed here. What Admin CAN do is know, at creation time, which
// projects the client already has, and tidy up afterwards. This model decides what to tell them. It never guesses: it only names a
// single project as the likely duplicate when exactly one relevant project exists and it is the request-created Pending Review one.

export interface OverlapProject {
  id: string
  name: string
  reference: string | null
  status: string
}

export type OverlapLevel = 'none' | 'recommend' | 'review'

export interface ProjectOverlap {
  level: OverlapLevel
  /** Projects that are still live for the client: everything except Completed and Archived. */
  relevant: OverlapProject[]
  /** Request-created intake projects (status Pending Review) among the relevant ones. */
  intake: OverlapProject[]
  /** Set ONLY when exactly one relevant project exists and it is an intake project. Never a guess between several. */
  recommended: OverlapProject | null
}

const CLOSED = new Set(['completed', 'archived'])
const norm = (s: string) => String(s || '').trim().toLowerCase()

export function assessProjectOverlap(projects: OverlapProject[]): ProjectOverlap {
  const relevant = projects.filter((p) => !CLOSED.has(norm(p.status)))
  const intake = relevant.filter((p) => norm(p.status) === 'pending review')
  const recommended = relevant.length === 1 && intake.length === 1 ? intake[0] : null
  const level: OverlapLevel = relevant.length === 0 ? 'none' : recommended ? 'recommend' : 'review'
  return { level, relevant, intake, recommended }
}

/** What Approval does, in one sentence. Shown in every state that has a live project. */
export const APPROVAL_CREATES_PROJECT =
  'When the client approves this proposal, a NEW project is created for it. A proposal cannot be attached to an existing project before it is approved.'

/** The tidy-up Admin can actually do afterwards with the existing project controls. */
export const ARCHIVE_ADVICE = 'If it is the same work, set the earlier project to Archived after approval so the client does not see two projects for one engagement.'
