// src/app/api/client-portal/dashboard/route.ts
//
// GET — the Client Portal Home, aggregated server-side for the CALLER's own account.
//
// Scope is derived from the verified session and from nothing else:
//
//   auth.uid()  ->  clients row (user_id)  ->  clients.id
//
// The request carries no parameters at all: no client id, merchant id or filter is read
// from the URL, body or headers, so a caller cannot widen or redirect the scope.
//
// The route reuses the existing session-bound patterns (service-role client used only
// AFTER the caller is resolved, every query carrying the caller-derived predicate) and
// the existing Growth Profile endpoint. It does NOT re-implement the release gate: the
// Growth Profile is obtained by calling that route's own GET, so a profile that route
// withholds (no approving decision, release flag off, inconsistent records…) is withheld
// here too, byte for byte. This route never reads growth_profiles itself.
//
// The response is an explicit allow-list. No raw rows, internal notes, merchant or admin
// fields, storage paths, raw file URLs or project_messages leave the server.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GET as getGrowthProfile } from '../growth-profile/route'
import {
  buildActivity,
  buildAttention,
  deriveCurrentPriority,
  deriveSnapshot,
  selectActiveWork,
  selectOpenProposal,
  type DeliverableRow,
  type FileRow,
  type NotificationRow,
  type ProjectRow,
  type ProposalRow,
  type ReleasedProfile,
} from '@/lib/client-portal/dashboard'

export const dynamic = 'force-dynamic'

// Same visibility set as /api/client-portal/proposals.
const CLIENT_VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested']

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

/** Growth Profile via the existing route, so its release gate is the only gate. */
async function loadGrowth(): Promise<{ state: string; profile: ReleasedProfile | null }> {
  try {
    const res = await getGrowthProfile()
    const payload: any = await res.json().catch(() => null)
    if (res.status === 409) return { state: payload?.state === 'inconsistent' ? 'inconsistent' : 'ambiguous', profile: null }
    if (!res.ok) return { state: 'error', profile: null }
    if (payload?.state === 'ready' && payload.profile) {
      const p = payload.profile
      return {
        state: 'ready',
        profile: {
          hgri_score: typeof p.hgri_score === 'number' ? p.hgri_score : null,
          growth_classification: typeof p.growth_classification === 'string' ? p.growth_classification : null,
          pillars: p.pillars && typeof p.pillars === 'object' ? p.pillars : null,
          recommendations: Array.isArray(p.recommendations) ? p.recommendations.filter((r: unknown) => typeof r === 'string') : [],
        },
      }
    }
    return { state: typeof payload?.state === 'string' ? payload.state : 'error', profile: null }
  } catch {
    return { state: 'error', profile: null }
  }
}

export async function GET() {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // limit(2) so ambiguity is detectable and refused instead of guessed.
    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id, full_name, business_name')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error('[client-portal/dashboard] client lookup failed')
      return NextResponse.json({ error: 'Failed to load your dashboard' }, { status: 500 })
    }
    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (clientRows.length > 1) {
      console.error(`[client-portal/dashboard] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const client = clientRows[0] as { id: string; full_name: string | null; business_name: string | null }
    const clientId = client.id
    const unavailable: string[] = []
    const rows = <T,>(label: string, result: { data: T[] | null; error: unknown }): T[] => {
      if (result.error) {
        unavailable.push(label)
        console.error(`[client-portal/dashboard] ${label} query failed`)
        return []
      }
      return result.data || []
    }

    // Every query below is predicated on the caller-derived clients.id.
    const [growth, projectsRes, proposalsRes, notificationsRes, filesRes] = await Promise.all([
      loadGrowth(),
      adminClient
        .from('projects')
        .select('id, project_id, project_name, status, progress, description, start_date, expected_completion_date, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50),
      adminClient
        .from('proposals')
        .select('id, proposal_number, title, status, pricing, expires_at, sent_at, created_at')
        .eq('client_id', clientId)
        .in('status', CLIENT_VISIBLE_STATUSES)
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(20),
      adminClient
        .from('notifications')
        .select('id, type, title, message, link, entity_type, entity_id, created_at, read_at')
        .eq('recipient_scope', 'client')
        .eq('recipient_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20),
      adminClient
        .from('project_files')
        .select('id, file_name, file_type, file_size, uploaded_at, project_id')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false })
        .limit(5),
    ])

    const projects = rows<ProjectRow>('projects', projectsRes)
    const proposals = rows<ProposalRow>('proposals', proposalsRes)
    const notifications = rows<NotificationRow>('notifications', notificationsRes)
    const files = rows<FileRow>('files', filesRes)

    // project_deliverables has no client_id: ownership is project_id -> projects.client_id,
    // using only project ids this client already owns. No owned projects, no query.
    let deliverables: DeliverableRow[] = []
    const projectIds = projects.map((p) => p.id)
    if (projectIds.length > 0) {
      deliverables = rows<DeliverableRow>(
        'deliverables',
        await adminClient
          .from('project_deliverables')
          .select('id, title, version, uploaded_at, project_id')
          .in('project_id', projectIds)
          .order('uploaded_at', { ascending: false })
          .limit(5),
      )
    }

    const now = new Date()
    const profile = growth.profile

    return NextResponse.json({
      client: {
        firstName: (client.full_name || '').trim().split(/\s+/)[0] || null,
        businessName: client.business_name || null,
      },
      // Derived only from a profile the Growth Profile route released.
      priority: profile ? deriveCurrentPriority(profile) : null,
      growth: {
        state: growth.state,
        snapshot: profile ? deriveSnapshot(profile) : null,
      },
      attention: buildAttention({ proposals, projects, now }),
      activeWork: selectActiveWork(projects),
      activity: buildActivity({ notifications, files, deliverables, proposals }),
      files: files.map((f) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        size: Number.isFinite(Number(f.file_size)) ? Number(f.file_size) : null,
        uploadedAt: f.uploaded_at,
      })),
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        version: d.version,
        uploadedAt: d.uploaded_at,
      })),
      proposal: selectOpenProposal(proposals, now),
      // Sections whose query failed. The page must not claim "nothing needs attention"
      // for a section it could not read.
      unavailable,
    })
  } catch (error) {
    console.error('❌ Client dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load your dashboard' }, { status: 500 })
  }
}
