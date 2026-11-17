// src/app/api/admin/projects/[project_id]/milestones/route.ts
//
// GET  — the project's milestones in display order.
// POST — create one. { title, description?, due_date?, status? }. Appended after the existing ones.
// Gate: requireActiveAdmin. The project id comes from the URL and is verified to exist first; nothing in the
// body can name a project, client or id.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'
import { loadAdminProject, checkViolation } from '@/lib/projects/project-guard'
import { parseMilestone } from '@/lib/projects/operations-validation'
import { recordActivity } from '@/lib/activity/activity'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const guard = await loadAdminProject(auth.db, params?.project_id)
  if (!guard.ok) return guard.response

  const { data, error } = await auth.db
    .from('project_milestones')
    .select('id, title, description, status, due_date, sort_order, completed_at')
    .eq('project_id', guard.project.id)
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(200)
  if (error) return queryFailure('milestones read', error)
  return NextResponse.json({ milestones: data || [] })
}

export async function POST(request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response

  const parsed = parseMilestone(await request.json().catch(() => null), 'create')
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const { data: last } = await db
      .from('project_milestones')
      .select('sort_order')
      .eq('project_id', guard.project.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const status = parsed.value.status ?? 'pending'
    const { data, error } = await db
      .from('project_milestones')
      .insert({
        project_id: guard.project.id,
        title: parsed.value.title,
        description: parsed.value.description ?? null,
        due_date: parsed.value.due_date ?? null,
        status,
        sort_order: (Number(last?.sort_order) || 0) + 1,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .select('id, title, description, status, due_date, sort_order, completed_at')
      .single()

    if (error) {
      if (checkViolation(error)) {
        return NextResponse.json({ code: 'status_check_violation', error: `The database does not accept the status "${status}" for milestones. Nothing was saved.` }, { status: 409 })
      }
      return queryFailure('milestone create', error)
    }

    await recordActivity(db, {
      clientId: guard.project.client_id,
      projectId: guard.project.id,
      actorUserId: userId,
      actorRole: 'admin',
      entityType: 'milestone',
      entityId: data.id,
      action: 'milestone_added',
      summary: `Milestone added: ${String(data.title).slice(0, 100)}`,
      visibility: 'client',
      dedupeKey: `milestone_added:${data.id}`,
    })
    return NextResponse.json({ milestone: data }, { status: 201 })
  } catch (error) {
    return queryFailure('milestone create', error)
  }
}
