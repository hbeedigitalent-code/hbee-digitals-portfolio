// src/app/api/client-portal/projects/[id]/route.ts
//
// GET — ONE project of the CALLER's own client account, with the real related rows the
// workspace page shows: milestones, recent files, deliverables and project requests.
//
// Ownership: projects.id = :id AND projects.client_id = <clients.id from the session>. A project
// that is missing, belongs to another client, or has a malformed id returns the SAME 404, so the
// route cannot be used to enumerate project ids. Everything related is then fetched ONLY through
// that verified project id (files and requests additionally carry the client id).
//
// Allow-list only. No raw rows: no file_url (deliverables expose `hasFile`; downloads go through
// /api/client-portal/deliverables/[id]/signed-url and /api/client-portal/files/[id]/signed-url),
// no storage paths, no client id, no admin columns. A failed related query is reported in
// `unavailable` rather than being shown as "nothing here".

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { CLIENT_VISIBLE_DELIVERABLE_STATUSES } from '@/lib/projects/operations-validation'
import { normalizeRequestStatus } from '@/lib/requests/request-status'
import { CLIENT_VISIBLE_INVOICE_STATUSES, CLIENT_VISIBLE_PROPOSAL_STATUSES } from '@/lib/commerce/documents'
import { loadInvoiceSummaries, pickProjectInvoice, pickProjectProposal, summarizeProposal } from '@/lib/commerce/summaries'
import { proposalStatusLabel } from '@/lib/proposal-status'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i


export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const clientRow = portal.client

    const projectId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(projectId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }


    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, project_id, project_name, status, progress, description, start_date, expected_completion_date, created_at')
      .eq('id', projectId)
      .eq('client_id', clientRow.id)
      .maybeSingle()

    if (projectError) {
      console.error('[client-portal/projects/id] project query failed')
      return NextResponse.json({ error: 'Failed to load this project' }, { status: 500 })
    }
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const unavailable: string[] = []
    const rows = <T,>(label: string, result: { data: T[] | null; error: unknown }): T[] => {
      if (result.error) {
        unavailable.push(label)
        console.error(`[client-portal/projects/id] ${label} query failed`)
        return []
      }
      return result.data || []
    }

    const [milestonesRes, filesRes, deliverablesRes, requestsRes, teamRes, activityRes] = await Promise.all([
      adminClient
        .from('project_milestones')
        .select('id, title, description, status, due_date, sort_order, completed_at')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: true })
        .order('due_date', { ascending: true })
        .limit(50),
      adminClient
        .from('project_files')
        .select('id, file_name, file_type, file_size, uploaded_at')
        .eq('project_id', project.id)
        .eq('client_id', clientRow.id)
        .order('uploaded_at', { ascending: false })
        .limit(5),
      adminClient
        .from('project_deliverables')
        .select('id, title, description, version, uploaded_at, file_url, status, due_date')
        .eq('project_id', project.id)
        // 'draft' deliverables are Admin work in progress: filtered in the database query, not after it.
        .in('status', CLIENT_VISIBLE_DELIVERABLE_STATUSES as string[])
        .order('uploaded_at', { ascending: false })
        .limit(10),
      adminClient
        .from('project_requests')
        .select('id, title, status, created_at')
        .eq('project_id', project.id)
        .eq('client_id', clientRow.id)
        .order('created_at', { ascending: false })
        .limit(5),
      // Only HOW MANY Hbee people are assigned — no identity, no email. Visibility is a deliberate S6.3 limit.
      adminClient.from('project_team_assignments').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
      adminClient
        .from('activity_events')
        .select('id, summary, created_at')
        .eq('project_id', project.id)
        .eq('client_id', clientRow.id)
        .eq('visibility', 'client')
        .order('created_at', { ascending: false })
        .limit(15),
    ])

    const milestones = rows<any>('milestones', milestonesRes)
    const files = rows<any>('files', filesRes)
    const deliverables = rows<any>('deliverables', deliverablesRes)
    const requests = rows<any>('requests', requestsRes)
    const activity = rows<any>('activity', activityRes as any)

    // PROPOSAL & BILLING (read-only). The proposal this project was created from (an approved proposal links to its project), and
    // the invoice the client should look at. Both come through the verified project id and the delivered-status lists, so a draft
    // or a voided invoice is never shown, and nothing here changes a proposal or an invoice.
    const proposalRows = rows<any>(
      'proposal',
      await adminClient
        .from('proposals')
        .select('id, proposal_number, title, status, currency, total, approved_version, converted_to_project_id, created_at')
        .eq('client_id', clientRow.id)
        .eq('converted_to_project_id', project.id)
        .in('status', CLIENT_VISIBLE_PROPOSAL_STATUSES)
        .order('created_at', { ascending: false })
        .limit(5),
    )
    const proposal = pickProjectProposal(proposalRows.map(summarizeProposal))
    const invoiceRead = await loadInvoiceSummaries(adminClient, [project.id], { statuses: CLIENT_VISIBLE_INVOICE_STATUSES, limit: 20 })
    if (!invoiceRead.ok) {
      unavailable.push('invoice')
      console.error('[client-portal/projects/id] invoice query failed')
    }
    const { invoice, others: otherInvoices } = pickProjectInvoice(invoiceRead.ok ? invoiceRead.invoices : [])

    return NextResponse.json({
      project: {
        id: project.id,
        reference: project.project_id || null,
        name: (project.project_name || '').trim() || 'Untitled project',
        status: project.status || null,
        progress: project.progress ?? null,
        description: typeof project.description === 'string' ? project.description : null,
        startDate: project.start_date || null,
        expectedCompletion: project.expected_completion_date || null,
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description || null,
        status: m.status || null,
        dueDate: m.due_date || null,
        completedAt: m.completed_at || null,
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type || null,
        size: Number.isFinite(Number(f.file_size)) ? Number(f.file_size) : null,
        uploadedAt: f.uploaded_at || null,
      })),
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description || null,
        version: d.version || null,
        uploadedAt: d.uploaded_at || null,
        status: d.status || null,
        dueDate: d.due_date || null,
        hasFile: typeof d.file_url === 'string' && d.file_url.trim().length > 0,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        title: r.title,
        status: normalizeRequestStatus(r.status),
        createdAt: r.created_at || null,
      })),
      commerce: {
        proposal: proposal
          ? {
              id: proposal.id,
              number: proposal.number,
              title: proposal.title,
              status: proposal.status,
              statusLabel: proposalStatusLabel(proposal.status),
              currency: proposal.currency,
              total: proposal.total,
              approvedVersion: proposal.approvedVersion,
            }
          : null,
        invoice: invoice
          ? {
              id: invoice.id,
              number: invoice.number,
              status: invoice.displayStatus,
              statusLabel: invoice.statusLabel,
              currency: invoice.currency,
              total: invoice.total,
              paid: invoice.paid,
              balance: invoice.balance,
              dueDate: invoice.dueDate,
            }
          : null,
        otherInvoices,
      },
      teamSize: teamRes && !teamRes.error ? Number(teamRes.count) || 0 : null,
      activity: activity.map((a) => ({ id: a.id, summary: a.summary, createdAt: a.created_at })),
      unavailable,
    })
  } catch (error) {
    console.error('❌ Client project detail error:', error)
    return NextResponse.json({ error: 'Failed to load this project' }, { status: 500 })
  }
}
