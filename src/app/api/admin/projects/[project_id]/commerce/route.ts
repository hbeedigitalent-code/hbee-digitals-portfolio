// src/app/api/admin/projects/[project_id]/commerce/route.ts
//
// GET — the proposal(s) and invoice(s) of ONE project for the Admin project page, with each invoice's status and balance and the
// total still owing. READ-ONLY. The route parameter is the projects.id UUID (like every project route). Gate: requireActiveAdmin.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadProjectCommerce } from '@/lib/commerce/summaries'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.project_id === 'string' ? params.project_id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    return NextResponse.json(await loadProjectCommerce(auth.db, id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('❌ Admin project commerce summary error:', error)
    return NextResponse.json({ error: 'Failed to load the commercial summary' }, { status: 500 })
  }
}
