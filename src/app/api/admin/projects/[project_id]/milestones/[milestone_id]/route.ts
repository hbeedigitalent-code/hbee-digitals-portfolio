// src/app/api/admin/projects/[project_id]/milestones/[milestone_id]/route.ts
//
// PATCH  — edit a milestone: { title?, description?, due_date?, status? }. Marking it 'completed' stamps
//          completed_at, writes a client-visible activity event and notifies the client (idempotent on the
//          event); moving it off 'completed' clears completed_at.
// DELETE — remove it. Both address the row as (id = :milestone AND project_id = :project), so a milestone id
//          from another project is a 404, never a cross-project write.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadAdminProject, checkViolation } from '@/lib/projects/project-guard'
import { parseMilestone } from '@/lib/projects/operations-validation'
import { recordActivity } from '@/lib/activity/activity'
import { createNotification } from '@/lib/notifications/createNotification'

export const dynamic = 'force-dynamic'

type Ctx = { params: { project_id: string; milestone_id: string } }

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const mid = typeof params?.milestone_id === 'string' ? params.milestone_id.trim() : ''
  if (!ADMIN_UUID_RE.test(mid)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = parseMilestone(await request.json().catch(() => null), 'update')
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const { data: existing, error: lookupError } = await db
      .from('project_milestones')
      .select('id, title, status')
      .eq('id', mid)
      .eq('project_id', guard.project.id)
      .maybeSingle()
    if (lookupError) return queryFailure('milestone lookup', lookupError)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = { ...parsed.value }
    const becameComplete = parsed.value.status === 'completed' && String(existing.status || '').toLowerCase() !== 'completed'
    if (parsed.value.status !== undefined) updates.completed_at = parsed.value.status === 'completed' ? new Date().toISOString() : null

    const { data, error } = await db
      .from('project_milestones')
      .update(updates)
      .eq('id', mid)
      .eq('project_id', guard.project.id)
      .select('id, title, description, status, due_date, sort_order, completed_at')
      .maybeSingle()
    if (error) {
      if (checkViolation(error)) {
        return NextResponse.json({ code: 'status_check_violation', error: 'The database does not accept that milestone status. Nothing was saved.' }, { status: 409 })
      }
      return queryFailure('milestone update', error)
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (becameComplete) {
      const eventId = await recordActivity(db, {
        clientId: guard.project.client_id,
        projectId: guard.project.id,
        actorUserId: userId,
        actorRole: 'admin',
        entityType: 'milestone',
        entityId: mid,
        action: 'milestone_completed',
        summary: `Milestone completed: ${String(data.title).slice(0, 100)}`,
        visibility: 'client',
      })
      if (eventId && guard.project.client_id) {
        await createNotification({
          scope: 'client',
          recipientId: guard.project.client_id,
          type: 'milestone_completed',
          title: 'A project milestone was completed',
          message: `${String(data.title).slice(0, 120)}`,
          entityType: 'activity_event',
          entityId: eventId,
          link: `/client-portal/projects/${guard.project.id}`,
        })
      }
    }
    return NextResponse.json({ milestone: data })
  } catch (error) {
    return queryFailure('milestone update', error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const mid = typeof params?.milestone_id === 'string' ? params.milestone_id.trim() : ''
  if (!ADMIN_UUID_RE.test(mid)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db.from('project_milestones').delete().eq('id', mid).eq('project_id', guard.project.id).select('id')
  if (error) return queryFailure('milestone delete', error)
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
