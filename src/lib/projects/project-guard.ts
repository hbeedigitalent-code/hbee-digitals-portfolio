// src/lib/projects/project-guard.ts
//
// SERVER-ONLY. Shared by the Admin milestone / deliverable / team routes: confirm the project in the URL exists
// and return its owning client. Every child row those routes touch is then addressed THROUGH this project id
// (child.project_id = :project AND child.id = :child), so an id from another project — or another client —
// can never be read, changed or deleted by guessing it.
//
// CLIENT PROJECTS ONLY. `projects` is shared with the public portfolio side (rows with no client_id, anon-readable
// in production). Milestones, deliverables and team assignments are CLIENT operational data, so a project with no
// client_id is refused here with 409 — a public portfolio / case-study record can never be given a milestone, a
// client deliverable or a delivery team through these routes.

import { NextResponse } from 'next/server'
import { ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export interface GuardedProject {
  id: string
  client_id: string | null
  project_name: string | null
}

export async function loadAdminProject(
  db: any,
  rawId: unknown,
): Promise<{ ok: true; project: GuardedProject } | { ok: false; response: NextResponse }> {
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const { data, error } = await db.from('projects').select('id, client_id, project_name').eq('id', id).maybeSingle()
  if (error) {
    console.error(`[admin/projects] project lookup failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
    return { ok: false, response: NextResponse.json({ error: 'Failed to load data' }, { status: 500 }) }
  }
  if (!data) return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (!data.client_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 'not_client_project', error: 'This is not a client project, so it has no milestones, deliverables or delivery team.' },
        { status: 409 },
      ),
    }
  }
  return { ok: true, project: data as GuardedProject }
}

export function checkViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23514'
}
