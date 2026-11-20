// src/app/api/admin/proposals/[id]/convert/route.ts
//
// POST — explicitly convert an APPROVED, not-yet-converted proposal into its operational client project. This is the path for
// the historical approved proposal (which the migration deliberately left unconverted) and for any approved proposal whose
// conversion did not happen at approval. It creates exactly one client project (never a public portfolio row), links it, and is
// idempotent: converting again returns the existing project. The body is ignored; client and project are never named by the caller.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpcWithProjectReference, refusal } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await callRpcWithProjectReference(auth.db, 'convert_approved_proposal', { p_proposal_id: id, p_actor: auth.userId })
  if (!result.ok) return result.response
  const refused = refusal(result.outcome, ['converted', 'already_converted'])
  if (refused) return refused
  return NextResponse.json({ success: true, converted: result.outcome.status === 'converted', projectId: result.outcome.project_id })
}
