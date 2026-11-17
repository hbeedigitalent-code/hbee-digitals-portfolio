// src/app/api/admin/projects/[project_id]/team/route.ts
//
// GET    — the project's assigned delivery team, plus the active admins who can still be assigned.
// POST   — assign: { admin_user_id }. The user must be an ACTIVE admin_users row; assigning twice is a no-op.
// DELETE — unassign: { admin_user_id }.
//
// IDENTITY DECISION. The public CMS `team_members` table is website content with no link to a login, so it is
// NOT used. Assignments reference admin_users.user_id — the identity that already passes requireActiveAdmin.
// The repository does not show a display-name column on admin_users (preflight section G reports whether one
// exists), so this route returns only opaque ids and a short label; it deliberately returns no email. Nothing
// from this route is shown to clients in S6.3: the Portal reports only how many Hbee team members are assigned.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadAdminProject } from '@/lib/projects/project-guard'
import { recordActivity } from '@/lib/activity/activity'

export const dynamic = 'force-dynamic'

const label = (id: string) => `Team member ${id.slice(0, 8)}`

export async function GET(_request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response

  const [assigned, admins] = await Promise.all([
    db.from('project_team_assignments').select('admin_user_id, assigned_at').eq('project_id', guard.project.id).limit(100),
    db.from('admin_users').select('user_id').eq('is_active', true).limit(200),
  ])
  if (assigned.error) return queryFailure('team read', assigned.error)
  if (admins.error) return queryFailure('admins read', admins.error)

  const assignedIds = new Set((assigned.data || []).map((a: any) => a.admin_user_id as string))
  return NextResponse.json({
    team: (assigned.data || []).map((a: any) => ({ adminUserId: a.admin_user_id, label: label(a.admin_user_id), assignedAt: a.assigned_at, you: a.admin_user_id === userId })),
    assignable: (admins.data || [])
      .filter((a: any) => !assignedIds.has(a.user_id))
      .map((a: any) => ({ adminUserId: a.user_id, label: label(a.user_id), you: a.user_id === userId })),
  })
}

async function readTarget(request: Request): Promise<string | null> {
  const body = await request.json().catch(() => null)
  const id = body && typeof body.admin_user_id === 'string' ? body.admin_user_id.trim() : ''
  return ADMIN_UUID_RE.test(id) ? id : null
}

export async function POST(request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const target = await readTarget(request)
  if (!target) return NextResponse.json({ error: 'Choose a team member.' }, { status: 400 })

  const { data: admin, error: adminError } = await db.from('admin_users').select('user_id').eq('user_id', target).eq('is_active', true).maybeSingle()
  if (adminError) return queryFailure('admin lookup', adminError)
  if (!admin) return NextResponse.json({ error: 'That person is not an active team member.' }, { status: 409 })

  const { error } = await db.from('project_team_assignments').insert({ project_id: guard.project.id, admin_user_id: target, assigned_by: userId })
  if (error && (error as { code?: string }).code !== '23505') return queryFailure('team assign', error)

  if (!error) {
    await recordActivity(db, {
      clientId: guard.project.client_id,
      projectId: guard.project.id,
      actorUserId: userId,
      actorRole: 'admin',
      entityType: 'project',
      entityId: guard.project.id,
      action: 'team_member_assigned',
      summary: 'A team member was assigned to the project',
      visibility: 'internal',
    })
  }
  return NextResponse.json({ ok: true, alreadyAssigned: !!error })
}

export async function DELETE(request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const target = await readTarget(request)
  if (!target) return NextResponse.json({ error: 'Choose a team member.' }, { status: 400 })

  const { data, error } = await db.from('project_team_assignments').delete().eq('project_id', guard.project.id).eq('admin_user_id', target).select('id')
  if (error) return queryFailure('team unassign', error)
  if (data && data.length > 0) {
    await recordActivity(db, {
      clientId: guard.project.client_id,
      projectId: guard.project.id,
      actorUserId: userId,
      actorRole: 'admin',
      entityType: 'project',
      entityId: guard.project.id,
      action: 'team_member_unassigned',
      summary: 'A team member was removed from the project',
      visibility: 'internal',
    })
  }
  return NextResponse.json({ ok: true })
}
