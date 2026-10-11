// src/lib/client-portal/projects-display.ts
//
// Pure presentation helpers for the Client Portal Projects pages (Phase 18.6). No I/O.
//
// Everything is derived from the REAL stored status string. There is no delivery-stage field
// in the backend, so no Assess → Prioritize → Build → Activate → Optimize mapping exists here,
// and the status vocabulary is never extended: groupings and "needs from you" are presentation
// over the values admins already set.

import { toCalendarDate } from '@/lib/projects/project-date'

/** The statuses admins can set (see the admin project page). Used only for tones and labels. */
export const PROJECT_STATUSES = [
  'Pending Review',
  'Onboarding',
  'Assets Required',
  'In Review',
  'In Progress',
  'Awaiting Client Feedback',
  'Revision Stage',
  'Completed',
  'Archived',
] as const

const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase()

export type ProjectGroup = 'needs' | 'active' | 'completed' | 'archived'

/** needs = a status that is waiting on the client; completed / archived as stored; everything else active. */
export function projectGroup(status: string | null | undefined): ProjectGroup {
  const s = norm(status)
  if (s === 'archived') return 'archived'
  if (s === 'completed') return 'completed'
  if (s === 'assets required' || s === 'awaiting client feedback') return 'needs'
  return 'active'
}

export type ProjectFilter = 'all' | 'active' | 'needs' | 'completed' | 'archived'

export const PROJECT_FILTERS: Array<{ key: ProjectFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'needs', label: 'Needs you' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
]

/** "Active" = every project that is not Completed or Archived (so it includes Needs you). */
export function matchesProjectFilter(status: string | null | undefined, filter: ProjectFilter): boolean {
  const g = projectGroup(status)
  if (filter === 'all') return true
  if (filter === 'active') return g === 'active' || g === 'needs'
  return g === filter
}

export type StatusTone = 'info' | 'needs' | 'done' | 'muted'

export function statusTone(status: string | null | undefined): StatusTone {
  const g = projectGroup(status)
  if (g === 'needs') return 'needs'
  if (g === 'completed') return 'done'
  if (g === 'archived') return 'muted'
  return 'info'
}

/** A neutral, passive one-line explanation of the stored status. Presentation only. */
export function statusExplanation(status: string | null | undefined): string | null {
  switch (norm(status)) {
    case 'pending review':
      return 'This project is waiting to be reviewed.'
    case 'onboarding':
      return 'This project is being set up.'
    case 'assets required':
      return 'This project is waiting on assets.'
    case 'in review':
      return 'Work on this project is being reviewed.'
    case 'in progress':
      return 'Work on this project is under way.'
    case 'awaiting client feedback':
      return 'This project is waiting on your feedback.'
    case 'revision stage':
      return 'Revisions to this project are being made.'
    case 'completed':
      return 'This project is complete.'
    case 'archived':
      return 'This project has been archived.'
    default:
      return null
  }
}

export interface NeedsFromYou {
  title: string
  text: string
  /** Where the client can act. Both are existing portal routes. */
  actions: Array<{ label: string; href: string }>
}

/**
 * What the project needs from the client — ONLY from the two statuses that mean it:
 *   Assets Required            -> assets needed
 *   Awaiting Client Feedback   -> needs your attention
 * Requests the client has made are not "needs from you": they are waiting on Hbee. Anything
 * else (including Completed / Archived) needs nothing.
 */
export function needsFromYou(status: string | null | undefined): NeedsFromYou | null {
  switch (norm(status)) {
    case 'assets required':
      return {
        title: 'Assets needed',
        text: 'This project is marked Assets Required, so it is waiting on assets from you.',
        actions: [{ label: 'Upload files', href: '/client-portal/files#upload' }],
      }
    case 'awaiting client feedback':
      return {
        title: 'Needs your attention',
        text: 'This project is marked Awaiting Client Feedback, so it is waiting on your feedback.',
        actions: [{ label: 'Contact Hbee', href: '/contact' }],
      }
    default:
      return null
  }
}

/**
 * The stored progress as a 0–100 integer, or null when it is not set. A missing value is NOT
 * zero: 0 is a real value and is returned as 0 only when the stored progress is actually 0.
 */
export function parseProgress(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** A stored calendar date shown without any timezone shift, or null when not set. */
export function formatProjectDate(value: unknown): string | null {
  const parsed = toCalendarDate(value)
  if (!parsed.ok || !parsed.value) return null
  const [y, m, d] = parsed.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Humanise a stored status string (underscores to spaces, first letter capital) — never invents one. */
export function statusLabel(status: string | null | undefined): string {
  const t = (status || '').replace(/[_-]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'New'
}
