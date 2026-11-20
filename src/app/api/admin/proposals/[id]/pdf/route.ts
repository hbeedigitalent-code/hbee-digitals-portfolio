// src/app/api/admin/proposals/[id]/pdf/route.ts
//
// GET — the proposal PDF for an Admin, generated on demand from the authoritative records: the version snapshot the client was
// sent (or approved), or — for a draft — a live preview that is stamped "DRAFT PREVIEW". ?version=N selects an earlier version.
// Nothing is stored. Internal notes are not part of the document type, so they cannot be printed.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadProposalView, proposalPdfInput } from '@/lib/commerce/documents'
import { buildProposalPdf, pdfFileName } from '@/lib/commerce/pdf'
import { pdfResponse, pdfFailure } from '@/lib/commerce/pdf-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const v = Number(new URL(request.url).searchParams.get('version'))
  const version = Number.isInteger(v) && v >= 1 && v < 10000 ? v : undefined

  try {
    const loaded = await loadProposalView(auth.db, id, { admin: true, version })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const bytes = await buildProposalPdf(proposalPdfInput(loaded.view, loaded.client))
    return pdfResponse(bytes, pdfFileName('proposal', loaded.view.number, loaded.view.shownVersion))
  } catch (error) {
    console.error('❌ Admin proposal PDF error:', error instanceof Error ? error.name : 'unknown')
    return pdfFailure()
  }
}
