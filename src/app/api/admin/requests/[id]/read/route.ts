// src/app/api/admin/requests/[id]/read/route.ts
//
// POST — Admin has opened the thread: mark the client's messages on it as read by Admin.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(requestId)) return NextResponse.json({ ok: true, marked: 0 })

  const { data, error } = await auth.db.rpc('mark_request_read', { p_request_id: requestId, p_client_id: null, p_reader_role: 'admin' })
  if (error) return NextResponse.json({ ok: true, marked: 0 })
  return NextResponse.json({ ok: true, marked: typeof data === 'number' ? data : 0 })
}
