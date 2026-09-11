// src/app/api/uploads/initiate/route.ts
//
// POST — authorize an upload batch and issue one signed upload token per file.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so identity is
// re-verified here through authorizeUploadTarget() — the admin gate for
// proposal uploads, the client-account gate for client files.
//
// What the request may influence:  which proposal / project it targets, and the
//                                  file names, sizes and types it declares.
// What it may NOT influence:       the bucket, the object path, the uploader,
//                                  the client binding, or the permissions.
//
// The response DOES include each server-selected object path, because the
// browser must put it in the TUS `objectName` metadata. That is not a
// disclosure risk: the path is derived from identifiers the caller already
// holds, the signed token is scoped to that single path, and finalization
// ignores paths entirely — it accepts upload IDs only.

import { NextResponse } from 'next/server'
import {
  MAX_FILES_PER_BATCH,
  UPLOAD_SPECS,
  isUploadContext,
  validateUploadMetadata,
} from '@/lib/uploads/upload-config'
import {
  authorizeUploadTarget,
  buildObjectPath,
  createSignedUploadToken,
  newUploadId,
  resumableEndpoint,
  sessionExpiryIso,
} from '@/lib/uploads/upload-session'

export const dynamic = 'force-dynamic'

interface RequestedFile {
  fileName?: unknown
  size?: unknown
  contentType?: unknown
}

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // RECOVERY SWITCH. If the signed-upload path ever breaks against the
    // private buckets, this stops THIS ENDPOINT issuing new upload tokens while
    // it is repaired. Downloads are unaffected: they go through the signed-URL
    // routes, which do not consult this.
    //
    // WHAT IT IS NOT: it is not an access control. It cannot stop a request made
    // straight to the Supabase Storage API with a session cookie or a token
    // already in hand. Only the restrictive storage.objects policies added by
    // M10 do that, and they stay in force whether or not this flag is set —
    // never drop them as a workaround for a broken upload.
    if (process.env.UPLOADS_DISABLED === 'true') {
      return NextResponse.json(
        {
          error:
            'File uploads are temporarily paused for maintenance. Your existing ' +
            'files are unaffected. Please try again shortly.',
        },
        { status: 503 },
      )
    }

    const context = body?.context
    if (!isUploadContext(context)) {
      return NextResponse.json({ error: 'Unknown upload context.' }, { status: 400 })
    }

    const requested: RequestedFile[] = Array.isArray(body?.files) ? body.files : []
    if (requested.length === 0) {
      return NextResponse.json({ error: 'No files were provided.' }, { status: 400 })
    }
    if (requested.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_FILES_PER_BATCH} files at a time.` },
        { status: 400 },
      )
    }

    const endpoint = resumableEndpoint()
    if (!endpoint) {
      console.error('[uploads] NEXT_PUBLIC_SUPABASE_URL is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Authorization first: nothing is validated, generated or persisted for a
    // caller who is not entitled to this target.
    const auth = await authorizeUploadTarget({
      context,
      proposalId: body?.proposalId,
      projectId: body?.projectId,
      onBehalfOfClientId: body?.onBehalfOfClientId,
    })
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { binding } = auth
    const { db } = binding
    const spec = UPLOAD_SPECS[context]

    // Validate every declared file BEFORE writing anything, so a batch with one
    // bad file does not leave half a batch behind.
    const validated = []
    for (const file of requested) {
      const result = validateUploadMetadata(context, file)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      validated.push(result.file)
    }

    const batchId = newUploadId()
    const expiresAt = sessionExpiryIso()

    const { error: batchError } = await db.from('upload_batches').insert({
      id: batchId,
      context,
      client_id: binding.clientId,
      project_id: binding.projectId,
      proposal_id: binding.proposalId,
      created_by: binding.uploaderUserId,
      expected_count: validated.length,
      expires_at: expiresAt,
    })

    if (batchError) {
      console.error(
        `[uploads] batch insert failed (code=${
          (batchError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 })
    }

    const rows = validated.map((file) => {
      const uploadId = newUploadId()
      return {
        id: uploadId,
        batch_id: batchId,
        context,
        bucket: binding.bucket,
        object_path: buildObjectPath(binding, uploadId, file.fileName),
        uploader_user_id: binding.uploaderUserId,
        uploader_role: binding.uploaderRole,
        client_id: binding.clientId,
        project_id: binding.projectId,
        proposal_id: binding.proposalId,
        file_name: file.fileName,
        content_type: file.contentType,
        extension: file.extension,
        declared_size: file.size,
        status: 'pending',
        expires_at: expiresAt,
      }
    })

    const { error: sessionError } = await db.from('upload_sessions').insert(rows)
    if (sessionError) {
      console.error(
        `[uploads] session insert failed (code=${
          (sessionError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 })
    }

    // Tokens are issued only after the binding is durably recorded. If a token
    // cannot be issued the session stays `pending` and is swept by the cleanup
    // job — no object exists for it, so nothing is orphaned in Storage.
    const uploads = []
    for (const row of rows) {
      const token = await createSignedUploadToken(db, row.bucket, row.object_path)
      if (!token.ok) {
        return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 })
      }
      uploads.push({
        uploadId: row.id,
        token: token.token,
        bucket: row.bucket,
        objectName: row.object_path,
        fileName: row.file_name,
        contentType: row.content_type,
        size: row.declared_size,
      })
    }

    return NextResponse.json({
      batchId,
      endpoint,
      expiresAt,
      maxBytes: spec.maxBytes,
      uploads,
    })
  } catch (error) {
    console.error('[uploads] initiate error:', error)
    return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 })
  }
}
