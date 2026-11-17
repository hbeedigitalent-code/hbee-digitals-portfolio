// src/app/api/admin/clients/[client_id]/activity/route.ts
//
// GET — the most recent operational activity for ONE client (client-visible AND internal events; Admin sees
// both and each row says which it is). Gate: requireActiveAdmin. Read-only; activity_events is append-only.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { client_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await auth.db
    .from('activity_events')
    .select('id, actor_role, action, summary, visibility, request_id, project_id, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(25)
  if (error) return queryFailure('client activity', error)
  return NextResponse.json({
    events: (data || []).map((e: any) => ({
      id: e.id,
      actorRole: e.actor_role,
      summary: e.summary,
      visibility: e.visibility,
      requestId: e.request_id,
      projectId: e.project_id,
      createdAt: e.created_at,
    })),
  })
}
