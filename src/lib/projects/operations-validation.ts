// src/lib/projects/operations-validation.ts
//
// Pure validation for the Admin milestone / deliverable / team writers. Each parser copies ONLY the fields it
// names out of the body and refuses unknown ones, so a project_id, client_id, id or timestamp in a request can
// never reach a database write. Dates are real calendar dates (YYYY-MM-DD) or null.

import { toCalendarDate } from './project-date'

/**
 * The milestone vocabulary the application writes. The repository holds no DDL for project_milestones.status,
 * so whether the database constrains it is unproven (preflight section C reports any CHECK). The route
 * catches 23514 and says so rather than substituting another value.
 */
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

export const DELIVERABLE_STATUSES = ['draft', 'ready', 'delivered', 'revised'] as const
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

/** Statuses a CLIENT may see. 'draft' is Admin-only work in progress. */
export const CLIENT_VISIBLE_DELIVERABLE_STATUSES: readonly string[] = ['ready', 'delivered', 'revised']

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function plainObject(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
}

function refuseUnknown(b: Record<string, unknown>, allowed: readonly string[]): string | null {
  for (const key of Object.keys(b)) if (!allowed.includes(key)) return `"${key}" is not a field that can be set here.`
  return null
}

function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\r\n/g, '\n').trim()
  return t.length >= min && t.length <= max ? t : null
}

function date(v: unknown): { ok: true; value: string | null } | { ok: false } {
  if (v === null || v === '') return { ok: true, value: null }
  const parsed = toCalendarDate(v)
  return parsed.ok ? { ok: true, value: parsed.value } : { ok: false }
}

export interface MilestoneInput {
  title?: string
  description?: string | null
  due_date?: string | null
  status?: MilestoneStatus
}

export function parseMilestone(raw: unknown, mode: 'create' | 'update'): Result<MilestoneInput> {
  const b = plainObject(raw)
  if (!b) return { ok: false, error: 'Invalid request.' }
  const unknown = refuseUnknown(b, ['title', 'description', 'due_date', 'status'])
  if (unknown) return { ok: false, error: unknown }

  const out: MilestoneInput = {}
  if (b.title !== undefined || mode === 'create') {
    const title = text(b.title, 2, 140)
    if (!title) return { ok: false, error: 'A milestone needs a title of 2–140 characters.' }
    out.title = title
  }
  if (b.description !== undefined) {
    if (b.description === null || b.description === '') out.description = null
    else {
      const d = text(b.description, 1, 1000)
      if (!d) return { ok: false, error: 'The description is limited to 1000 characters.' }
      out.description = d
    }
  }
  if (b.due_date !== undefined) {
    const d = date(b.due_date)
    if (!d.ok) return { ok: false, error: 'The target date must be a real calendar date (YYYY-MM-DD).' }
    out.due_date = d.value
  }
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !(MILESTONE_STATUSES as readonly string[]).includes(b.status)) {
      return { ok: false, error: `Status must be one of: ${MILESTONE_STATUSES.join(', ')}.` }
    }
    out.status = b.status as MilestoneStatus
  }
  if (mode === 'update' && Object.keys(out).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, value: out }
}

export function parseReorder(raw: unknown): Result<string[]> {
  const b = plainObject(raw)
  if (!b || !Array.isArray(b.orderedIds)) return { ok: false, error: 'Invalid request.' }
  const ids = b.orderedIds
  if (ids.length === 0 || ids.length > 100 || !ids.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    return { ok: false, error: 'Invalid request.' }
  }
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'Each milestone may appear once.' }
  return { ok: true, value: ids as string[] }
}

export interface DeliverableInput {
  title?: string
  description?: string | null
  version?: string | null
  status?: DeliverableStatus
  due_date?: string | null
  /** A project_files id of the SAME client, whose stored path becomes the deliverable's file. */
  fileId?: string | null
  /** An https link instead of a stored file. */
  externalUrl?: string | null
}

export function parseDeliverable(raw: unknown, mode: 'create' | 'update'): Result<DeliverableInput> {
  const b = plainObject(raw)
  if (!b) return { ok: false, error: 'Invalid request.' }
  const unknown = refuseUnknown(b, ['title', 'description', 'version', 'status', 'due_date', 'fileId', 'externalUrl'])
  if (unknown) return { ok: false, error: unknown }

  const out: DeliverableInput = {}
  if (b.title !== undefined || mode === 'create') {
    const title = text(b.title, 2, 140)
    if (!title) return { ok: false, error: 'A deliverable needs a title of 2–140 characters.' }
    out.title = title
  }
  if (b.description !== undefined) {
    if (b.description === null || b.description === '') out.description = null
    else {
      const d = text(b.description, 1, 2000)
      if (!d) return { ok: false, error: 'The description is limited to 2000 characters.' }
      out.description = d
    }
  }
  if (b.version !== undefined) {
    if (b.version === null || b.version === '') out.version = null
    else {
      const v = text(b.version, 1, 30)
      if (!v) return { ok: false, error: 'The version is limited to 30 characters.' }
      out.version = v
    }
  }
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !(DELIVERABLE_STATUSES as readonly string[]).includes(b.status)) {
      return { ok: false, error: `Status must be one of: ${DELIVERABLE_STATUSES.join(', ')}.` }
    }
    out.status = b.status as DeliverableStatus
  }
  if (b.due_date !== undefined) {
    const d = date(b.due_date)
    if (!d.ok) return { ok: false, error: 'The due date must be a real calendar date (YYYY-MM-DD).' }
    out.due_date = d.value
  }
  if (b.fileId !== undefined && b.externalUrl !== undefined && b.fileId && b.externalUrl) {
    return { ok: false, error: 'Attach either a file or a link, not both.' }
  }
  if (b.fileId !== undefined) {
    if (b.fileId === null || b.fileId === '') out.fileId = null
    else if (typeof b.fileId === 'string' && UUID_RE.test(b.fileId)) out.fileId = b.fileId
    else return { ok: false, error: 'Invalid file.' }
  }
  if (b.externalUrl !== undefined) {
    if (b.externalUrl === null || b.externalUrl === '') out.externalUrl = null
    else {
      let u: URL | null = null
      try {
        u = typeof b.externalUrl === 'string' ? new URL(b.externalUrl.trim()) : null
      } catch {
        u = null
      }
      if (!u || u.protocol !== 'https:' || u.username || u.password) return { ok: false, error: 'The link must be a plain https address.' }
      out.externalUrl = u.toString()
    }
  }
  // project_deliverables.file_url is NOT NULL in production, so a deliverable ALWAYS has a file or a link. The API
  // never invents a placeholder URL to get around that: create requires one, and update may replace it but not clear it.
  if (mode === 'create' && !out.fileId && !out.externalUrl) {
    return { ok: false, error: 'Attach a file or an https link — every deliverable needs one.' }
  }
  if (mode === 'update' && (out.fileId === null || out.externalUrl === null) && !out.fileId && !out.externalUrl) {
    return { ok: false, error: 'A deliverable always keeps a file or link. Choose a replacement instead of clearing it.' }
  }
  if (mode === 'update' && Object.keys(out).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, value: out }
}
