// src/app/api/client-portal/files/[id]/route.ts
//
// DELETE — remove one of the CALLER'S OWN files.
//
// WHY THIS IS A SERVER ROUTE. The browser cannot be trusted with either half of
// a delete. It must not call storage.remove(), because M10's restrictive
// policies deny anon and authenticated every write on project-files and the
// call would simply fail; and it must not delete the metadata row, because M09
// revoked DELETE on project_files from `authenticated` for exactly this reason.
// Both halves happen here, under the service role, after ownership is proved.
//
// WHAT THE REQUEST MAY INFLUENCE: which file id is addressed. Nothing else.
// The bucket is a constant and the object path is derived from the STORED row
// through the same validating helper the download route uses — a caller cannot
// name a path, and a path that does not resolve is refused rather than guessed.
//
// ORDER MATTERS. The Storage object is removed FIRST and the metadata row only
// after that succeeds. The reverse order can orphan a file: if the row were
// deleted first and the object removal then failed, nothing would be left
// pointing at the object and the cleanup sweep would never see it.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { toProjectFilesObjectPath } from '@/lib/storage-path'

const PROJECT_FILES_BUCKET = 'project-files'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

// Lazy, non-throwing service-role client — the same pattern as the sibling
// signed-url route, so a missing key produces a clean 500 rather than crashing
// the route at import time.

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. The caller, from THEIR OWN session. Never an id, email or flag from
    //    the request.
    const portal = await resolvePortalClient({ requireConnected: true })
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const user = portal.user

    const fileId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(fileId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2. The caller's own client row. limit(2) so ambiguous ownership is
    //    detectable and refused rather than silently resolved to the first hit.

    const clientId: string = portal.client.id

    // 3. The row, scoped to id AND this client in ONE query. A file that exists
    //    but belongs to someone else produces the exact same 404 as a file that
    //    does not exist — no existence oracle.
    const { data: fileRow, error: fileError } = await adminClient
      .from('project_files')
      .select('id, client_id, file_url, file_name')
      .eq('id', fileId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (fileError) {
      console.error(
        `[client-portal/files] file lookup failed (code=${
          (fileError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to delete the file' }, { status: 500 })
    }
    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 4. The object path comes from the STORED value, validated by the same
    //    helper the download route uses, and scoped to this client's own
    //    prefix. Fail closed: a value that does not resolve never reaches
    //    Storage.
    const objectPath = toProjectFilesObjectPath(fileRow.file_url, fileRow.client_id)

    let storageRemoved = false
    let storageMissing = false

    if (objectPath) {
      const { error: removeError } = await adminClient.storage
        .from(PROJECT_FILES_BUCKET)
        .remove([objectPath])

      if (removeError) {
        // A MISSING OBJECT IS NOT A FAILURE. An authorized owner must still be
        // able to clear a stale metadata row whose object has already gone —
        // otherwise the file is undeletable and stays in their list forever.
        // Anything else is a real storage failure and the row is kept, so the
        // reference never outlives the object it points at.
        const status = String(
          (removeError as { statusCode?: string | number }).statusCode ?? '',
        )
        const message = String((removeError as { message?: string }).message ?? '')
        const notFound = status === '404' || /not.?found/i.test(message)

        if (!notFound) {
          console.error(
            `[client-portal/files] storage remove failed for ${fileRow.id}: ${message}`,
          )
          return NextResponse.json(
            { error: 'The file could not be removed from storage. Nothing was deleted.' },
            { status: 502 },
          )
        }
        storageMissing = true
      } else {
        storageRemoved = true
      }
    } else {
      // The stored reference is unusable. The metadata row is still this
      // client's own and is still theirs to remove; the object, wherever it is,
      // is left untouched rather than guessed at.
      console.error(
        `[client-portal/files] unresolvable object path on row ${fileRow.id}; removing metadata only`,
      )
      storageMissing = true
    }

    // 5. The metadata row, scoped to this client again so the delete cannot
    //    widen even if something above were wrong.
    const { error: deleteError } = await adminClient
      .from('project_files')
      .delete()
      .eq('id', fileRow.id)
      .eq('client_id', clientId)

    if (deleteError) {
      console.error(
        `[client-portal/files] metadata delete failed (code=${
          (deleteError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to delete the file' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: fileRow.id,
      // Reported honestly so a stale row that was cleaned up is distinguishable
      // from an object that was actually removed.
      storageRemoved,
      storageMissing,
    })
  } catch (error) {
    console.error('[client-portal/files] delete error:', error)
    return NextResponse.json({ error: 'Failed to delete the file' }, { status: 500 })
  }
}
