// src/app/api/admin/requests/route.ts
//
// GET — the Admin Request Inbox: every client request, filterable.
//
//   ?status=open|in_review|answered|closed|active   (active = everything not closed)
//   ?client_id=<uuid>   ?project_id=<uuid>   ?q=<text>   (q matches the request title and the client's name)
//
// Gate: requireActiveAdmin (session -> user-bound 2FA -> service role -> active admin row). Reads run under the
// service role AFTER that gate; no table name, column or filter comes from the request except the validated
// values above. `q` is reduced to a conservative character set before it is placed in a PostgREST filter, so it
// cannot inject filter syntax.
//
// Each row: canonical status, client + project names, last activity, and the number of CLIENT messages Admin has
// not yet read. Internal notes are Admin-only data and Admin is the only caller, so they are not hidden here —
// but this list carries no message bodies at all.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { isRequestStatus, normalizeRequestStatus } from '@/lib/requests/request-status'

export const dynamic = 'force-dynamic'

const LIMIT = 300

function cleanSearch(raw: string | null): string {
  return (raw || '').replace(/[^A-Za-z0-9 .'@-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

export async function GET(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth

  try {
    const url = new URL(request.url)
    const status = (url.searchParams.get('status') || '').trim()
    const clientId = (url.searchParams.get('client_id') || '').trim()
    const projectId = (url.searchParams.get('project_id') || '').trim()
    const q = cleanSearch(url.searchParams.get('q'))

    if (clientId && !ADMIN_UUID_RE.test(clientId)) return NextResponse.json({ requests: [], total: 0 })
    if (projectId && !ADMIN_UUID_RE.test(projectId)) return NextResponse.json({ requests: [], total: 0 })

    let query = db
      .from('project_requests')
      .select('id, client_id, project_id, title, status, created_at, last_activity_at')
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .limit(LIMIT)
    if (clientId) query = query.eq('client_id', clientId)
    if (projectId) query = query.eq('project_id', projectId)

    if (q) {
      const { data: matches } = await db
        .from('clients')
        .select('id')
        .or(`business_name.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(50)
      const ids = (matches || []).map((c: any) => c.id).filter((id: string) => ADMIN_UUID_RE.test(id))
      query = ids.length > 0 ? query.or(`title.ilike.%${q}%,client_id.in.(${ids.join(',')})`) : query.ilike('title', `%${q}%`)
    }

    const { data: rows, error } = await query
    if (error) return queryFailure('request inbox', error)

    let list = ((rows || []) as any[]).map((r) => ({ ...r, canonical: normalizeRequestStatus(r.status) }))
    if (status === 'active') list = list.filter((r) => r.canonical !== 'closed')
    else if (isRequestStatus(status)) list = list.filter((r) => r.canonical === status)

    const clientIds = Array.from(new Set(list.map((r) => r.client_id).filter(Boolean)))
    const projectIds = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)))
    const requestIds = list.map((r) => r.id)

    const [clientsRes, projectsRes, unreadRes] = await Promise.all([
      clientIds.length ? db.from('clients').select('id, full_name, business_name').in('id', clientIds) : Promise.resolve({ data: [], error: null }),
      projectIds.length ? db.from('projects').select('id, project_name, project_id').in('id', projectIds) : Promise.resolve({ data: [], error: null }),
      requestIds.length
        ? db.from('thread_messages').select('request_id').in('request_id', requestIds).eq('author_role', 'client').is('read_by_admin_at', null)
        : Promise.resolve({ data: [], error: null }),
    ])

    const clients = new Map<string, string>((clientsRes.data || []).map((c: any) => [c.id, (c.business_name || c.full_name || 'Client').trim()]))
    const projects = new Map<string, string>((projectsRes.data || []).map((p: any) => [p.id, (p.project_name || p.project_id || 'Project').trim()]))
    const unread = new Map<string, number>()
    for (const m of (unreadRes.data || []) as any[]) unread.set(m.request_id, (unread.get(m.request_id) || 0) + 1)

    return NextResponse.json({
      total: list.length,
      truncated: (rows || []).length >= LIMIT,
      requests: list.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.canonical,
        clientId: r.client_id,
        clientName: clients.get(r.client_id) ?? 'Unknown client',
        projectId: r.project_id,
        projectName: r.project_id ? projects.get(r.project_id) ?? null : null,
        createdAt: r.created_at,
        lastActivityAt: r.last_activity_at || r.created_at,
        unreadFromClient: unread.get(r.id) || 0,
      })),
      threadsUnavailable: !!unreadRes.error,
    })
  } catch (error) {
    return queryFailure('request inbox', error)
  }
}
