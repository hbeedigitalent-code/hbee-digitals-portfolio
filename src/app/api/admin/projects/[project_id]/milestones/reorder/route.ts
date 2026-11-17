// src/app/api/admin/projects/[project_id]/milestones/reorder/route.ts
//
// POST — { orderedIds: [milestone uuid, …] }. The list must be EXACTLY the project's current milestones (same
// set, each once); anything else — a missing id, an extra one, an id from another project — is refused before a
// row changes, so a reorder can neither drop nor smuggle a milestone.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'
import { loadAdminProject } from '@/lib/projects/project-guard'
import { parseReorder } from '@/lib/projects/operations-validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response

  const parsed = parseReorder(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: current, error } = await db.from('project_milestones').select('id').eq('project_id', guard.project.id).limit(200)
  if (error) return queryFailure('milestone reorder lookup', error)
  const have = new Set((current || []).map((m: any) => m.id as string))
  if (have.size !== parsed.value.length || !parsed.value.every((id) => have.has(id))) {
    return NextResponse.json({ code: 'reorder_mismatch', error: 'The list no longer matches the project’s milestones. Reload and try again.' }, { status: 409 })
  }

  for (let i = 0; i < parsed.value.length; i++) {
    const { error: updateError } = await db
      .from('project_milestones')
      .update({ sort_order: i + 1 })
      .eq('id', parsed.value[i])
      .eq('project_id', guard.project.id)
    if (updateError) return queryFailure('milestone reorder', updateError)
  }
  return NextResponse.json({ ok: true })
}
