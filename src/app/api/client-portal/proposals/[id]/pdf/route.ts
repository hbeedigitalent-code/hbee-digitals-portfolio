// src/app/api/client-portal/proposals/[id]/pdf/route.ts
//
// GET — the proposal PDF for the CALLER's own client, generated on demand from the version snapshot they were sent (the approved
// version once approved). Ownership and delivery are proved inside the load (client_id = session client, status delivered); a
// missing, foreign, draft or malformed id is the SAME 404. Nothing is stored and there is no URL to share. The document type has
// no field for internal notes, admin identity or change-request text, so none can be printed.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { loadProposalView, proposalPdfInput } from '@/lib/commerce/documents'
import { buildProposalPdf, pdfFileName } from '@/lib/commerce/pdf'
import { pdfResponse, pdfFailure } from '@/lib/commerce/pdf-response'
import { UUID_RE } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const loaded = await loadProposalView(portal.db, id, { clientId: portal.client.id })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const bytes = await buildProposalPdf(proposalPdfInput(loaded.view, loaded.client))
    return pdfResponse(bytes, pdfFileName('proposal', loaded.view.number, loaded.view.shownVersion))
  } catch (error) {
    console.error('❌ Client proposal PDF error:', error instanceof Error ? error.name : 'unknown')
    return pdfFailure()
  }
}
