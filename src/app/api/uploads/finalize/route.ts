// src/app/api/uploads/finalize/route.ts
//
// POST — commit an upload batch. The request carries UPLOAD IDS ONLY.
//
// There is no request field for an object path, bucket, file URL, client id,
// project id, uploader, size or MIME type. Every one of those is read back from
// the upload_sessions row the server wrote at initiate. A caller who forges an
// upload id gets 404-equivalent treatment, because the row's uploader must
// match the caller's own verified identity.
//
// Order, per file:
//   1. Load the stored session.                       (server state, not input)
//   2. Re-check authorization for its target.  (revoked access cannot commit)
//   3. Re-check the session belongs to this caller and this batch.
//   4. Verify the exact stored object in Storage: real size, real MIME, and the
//      context's size/type limits re-applied to what Storage recorded.
//   5. finalize_upload() — ONE database transaction that inserts the metadata
//      row, marks the session finalized and closes the batch.
//
// Idempotency: step 5 is keyed on a unique index over the target table's
// upload_session_id. Two concurrent finalizations of the same upload cannot
// produce two metadata rows; the loser reads the winner's row and returns the
// SAME result. A repeated finalization after success returns that same result
// too, and emits no second notification.
//
// Until step 5 commits, the object has no metadata row — and every download
// route in this application resolves objects through metadata rows — so an
// unfinalized object is not reachable by any normal download.

import { NextResponse } from 'next/server'
import { drainNotificationOutbox } from '@/lib/notifications/drainOutbox'
import { MAX_FILES_PER_BATCH, isUploadContext } from '@/lib/uploads/upload-config'
import {
  authorizeUploadTarget,
  isUuid,
  pathIsInScope,
  verifyStoredObject,
} from '@/lib/uploads/upload-session'

export const dynamic = 'force-dynamic'

type FileOutcome =
  | { uploadId: string; status: 'finalized'; fileId: string; fileName: string }
  | { uploadId: string; status: 'already_finalized'; fileId: string; fileName: string }
  | { uploadId: string; status: 'failed'; reason: string }

/** Reasons safe to show an authorized uploader about their OWN upload. */
const PUBLIC_REASONS: Record<string, string> = {
  object_not_found: 'The upload did not complete. Please try again.',
  stored_size_mismatch: 'The uploaded file did not match what was expected. Please try again.',
  stored_object_too_large: 'That file is larger than the allowed maximum.',
  stored_object_empty: 'That file appears to be empty.',
  stored_mime_not_allowed: 'That file type is not supported.',
  extension_not_allowed: 'That file type is not supported.',
  expired: 'This upload expired. Please start it again.',
}

function publicReason(reason: string): string {
  return PUBLIC_REASONS[reason] || 'That file could not be saved. Please try again.'
}

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

    const uploadIds: string[] = Array.isArray(body?.uploadIds)
      ? body.uploadIds.filter((id: unknown) => isUuid(id)).map((id: string) => id.trim())
      : []

    if (uploadIds.length === 0 || uploadIds.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Deduplicate: a client that sends the same id twice must not cause two
    // round trips, let alone two rows.
    const uniqueIds = Array.from(new Set(uploadIds))

    // ---- 1. Authorize BEFORE reading anything ---------------------------
    //
    // The gate differs by context (admin + 2FA for proposals, client-account
    // for client files), and the context is stored on the batch — but reading
    // the batch already requires privileged access. That circle is broken by
    // authorizing against the CALLER-SUPPLIED context first, then confirming
    // the stored batch matches it below. A caller who names the weaker gate for
    // a proposal batch passes the client check and then fails the match, so the
    // claimed context can only ever narrow what they may finalize, never widen.
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

    const { data: batch, error: batchError } = await db
      .from('upload_batches')
      .select('id, context, client_id, project_id, proposal_id, created_by')
      .eq('id', batchId)
      .maybeSingle()

    if (batchError) {
      console.error(
        `[uploads] batch read failed (code=${(batchError as { code?: string }).code ?? 'n/a'})`,
      )
      return NextResponse.json({ error: 'Failed to save files' }, { status: 500 })
    }
    if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ---- 2-3. The batch must be THIS caller's, in THIS context, for THIS
    //           target. A batch created for another proposal/project/client, or
    //           by another user, is not finalizable here.
    const sameTarget =
      batch.context === binding.context &&
      batch.created_by === binding.uploaderUserId &&
      (batch.proposal_id ?? null) === (binding.proposalId ?? null) &&
      (batch.project_id ?? null) === (binding.projectId ?? null) &&
      (batch.client_id ?? null) === (binding.clientId ?? null)

    if (!sameTarget) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: sessions, error: sessionError } = await db
      .from('upload_sessions')
      .select(
        'id, batch_id, context, bucket, object_path, uploader_user_id, client_id, ' +
          'project_id, proposal_id, file_name, content_type, extension, declared_size, ' +
          'status, result_file_id',
      )
      .eq('batch_id', batchId)
      .in('id', uniqueIds)

    if (sessionError) {
      console.error(
        `[uploads] session read failed (code=${
          (sessionError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to save files' }, { status: 500 })
    }

    const results: FileOutcome[] = []
    let batchCompleted = false

    for (const uploadId of uniqueIds) {
      const session = (sessions || []).find((s: any) => s.id === uploadId)

      // A missing session, or one belonging to someone else, is reported the
      // same way — nothing about another user's upload is disclosed.
      if (!session || session.uploader_user_id !== binding.uploaderUserId) {
        results.push({ uploadId, status: 'failed', reason: publicReason('object_not_found') })
        continue
      }

      // Defence in depth: the stored path must still sit inside the scope this
      // binding authorizes. A row whose path drifted is never acted on.
      if (!pathIsInScope(session.object_path, binding.pathScope)) {
        console.error(`[uploads] session ${uploadId} path is outside its binding scope — refused`)
        results.push({ uploadId, status: 'failed', reason: publicReason('object_not_found') })
        continue
      }

      // ---- 4. Verify the EXACT stored object ----------------------------
      const verified = await verifyStoredObject(
        db,
        binding.context,
        session.bucket,
        session.object_path,
        {
          size: session.declared_size,
          contentType: session.content_type,
          extension: session.extension,
        },
      )

      if (!verified.ok) {
        // The object is NOT deleted here. A verification failure may be a
        // transient Storage read, and deleting on an uncertain read is how a
        // good upload gets destroyed. The session stays pending and the
        // cleanup job decides later, after re-checking committed metadata.
        console.warn(`[uploads] session ${uploadId} verification failed: ${verified.reason}`)
        results.push({ uploadId, status: 'failed', reason: publicReason(verified.reason) })
        continue
      }

      // ---- 5. One transaction: metadata row + session state + batch close
      const { data: rpc, error: rpcError } = await db.rpc('finalize_upload', {
        p_upload_id: uploadId,
        p_actor: binding.uploaderUserId,
      })

      if (rpcError) {
        console.error(
          `[uploads] finalize_upload failed for ${uploadId} (code=${
            (rpcError as { code?: string }).code ?? 'n/a'
          })`,
        )
        results.push({ uploadId, status: 'failed', reason: publicReason('unknown') })
        continue
      }

      const outcome = rpc?.status as string | undefined

      if (outcome === 'finalized' || outcome === 'already_finalized') {
        if (rpc?.batch_completed === true) batchCompleted = true
        results.push({
          uploadId,
          status: outcome as 'finalized' | 'already_finalized',
          fileId: rpc.file_id,
          fileName: session.file_name,
        })
        continue
      }

      console.warn(`[uploads] finalize_upload returned ${outcome ?? 'no status'} for ${uploadId}`)
      results.push({
        uploadId,
        status: 'failed',
        reason: publicReason(outcome === 'expired' ? 'expired' : 'unknown'),
      })
    }

    // ---- Deliver whatever this batch enqueued ---------------------------
    //
    // The event itself was written INSIDE finalize_upload's transaction, so it
    // exists if and only if the files do. Delivery is a separate, retryable
    // step, and it runs on EVERY call — not only when this request happened to
    // be the one that completed the batch. That is what lets a retry of an
    // already-finalized upload recover a notification whose delivery was lost.
    //
    // Failure here is invisible to the caller: the files are committed, and the
    // scheduled drain will pick the event up.
    await drainNotificationOutbox(5)

    const saved = results.filter((r) => r.status !== 'failed').length
    return NextResponse.json({
      batchId,
      saved,
      files: results,
    })
  } catch (error) {
    console.error('[uploads] finalize error:', error)
    return NextResponse.json({ error: 'Failed to save files' }, { status: 500 })
  }
}
