// src/app/api/admin/clients/[client_id]/commerce/route.ts
//
// GET — a compact, READ-ONLY commercial summary of ONE client for the Admin client page: projects, proposals and invoices
// (counts, the latest few, and what is still owing per currency). Admin sees every status, drafts and voided invoices included.
// Gate: requireActiveAdmin. Nothing here creates, changes, issues or voids anything.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadClientCommerce } from '@/lib/commerce/summaries'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { client_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    return NextResponse.json(await loadClientCommerce(auth.db, id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('❌ Admin client commerce summary error:', error)
    return NextResponse.json({ error: 'Failed to load the commercial summary' }, { status: 500 })
  }
}
