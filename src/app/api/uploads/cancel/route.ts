// src/app/api/uploads/cancel/route.ts
//
// POST — settle uploads the user abandoned, by UPLOAD ID.
//
// WHY THIS EXISTS. Without it, a cancelled or failed file leaves its session
// `pending`, and the batch it belongs to stays open until the 26-hour sweep
// reaches it. A batch in which one file succeeded and one was cancelled would
// therefore not announce the successful file for a day. Settling closes the
// batch immediately and enqueues its event.
//
// WHAT IT DOES NOT DO. It does not delete the object. A signed upload token
// stays valid for up to 24 hours, so an object may still be being written; the
// scheduled sweep deletes it once no token can possibly be live. Cancelling is
// therefore immediate for the USER and deferred for STORAGE, and the UI must
// not claim otherwise.
//
// Authorization is the same gate as initiate/finalize, and the database
// additionally scopes the update to `uploader_user_id = p_actor`, so a caller
// can only ever settle their own uploads.

import { NextResponse } from 'next/server'
import { MAX_FILES_PER_BATCH, isUploadContext } from '@/lib/uploads/upload-config'
import { authorizeUploadTarget, isUuid } from '@/lib/uploads/upload-session'
import { drainNotificationOutbox } from '@/lib/notifications/drainOutbox'

export const dynamic = 'force-dynamic'

const TERMINAL = ['canceled', 'failed'] as const

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const batchId = typeof body?.batchId === 'string' ? body.batchId.trim() : ''
    if (!isUuid(batchId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const status = (TERMINAL as readonly string[]).includes(body?.status)
      ? (body.status as string)
      : 'canceled'

    const uploadIds: string[] | null = Array.isArray(body?.uploadIds)
      ? Array.from(
          new Set(
            body.uploadIds.filter((id: unknown) => isUuid(id)).map((id: string) => id.trim()),
          ),
        )
      : null

    if (uploadIds && (uploadIds.length === 0 || uploadIds.length > MAX_FILES_PER_BATCH)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const claimedContext = body?.context
    if (!isUploadContext(claimedContext)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const auth = await authorizeUploadTarget({
      context: claimedContext,
      proposalId: body?.proposalId,
      projectId: body?.projectId,
      onBehalfOfClientId: body?.onBehalfOfClientId,
    })
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { binding } = auth
    const { db } = binding

    // The batch must be this caller's, in this context. Same check as finalize.
    const { data: batch, error: batchError } = await db
      .from('upload_batches')
      .select('id, context, created_by, client_id, project_id, proposal_id')
      .eq('id', batchId)
      .maybeSingle()

    if (batchError) {
      console.error(
        `[uploads] cancel batch read failed (code=${
          (batchError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
    }
    if (
      !batch ||
      batch.context !== binding.context ||
      batch.created_by !== binding.uploaderUserId ||
      (batch.proposal_id ?? null) !== (binding.proposalId ?? null) ||
      (batch.project_id ?? null) !== (binding.projectId ?? null) ||
      (batch.client_id ?? null) !== (binding.clientId ?? null)
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await db.rpc('settle_upload_sessions', {
      p_batch_id: batchId,
      p_actor: binding.uploaderUserId,
      p_upload_ids: uploadIds,
      p_status: status,
      p_error: status === 'canceled' ? 'cancelled by the uploader' : 'upload failed',
    })

    if (error) {
      console.error(
        `[uploads] settle failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
      )
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
    }

    // Settling may have completed the batch and enqueued its event.
    if (data?.batch_completed) await drainNotificationOutbox(5)

    return NextResponse.json({
      ok: true,
      settled: data?.settled ?? 0,
      batchCompleted: data?.batch_completed ?? false,
    })
  } catch (error) {
    console.error('[uploads] cancel error:', error)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
