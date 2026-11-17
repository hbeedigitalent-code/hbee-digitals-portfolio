// src/lib/projects/deliverable-file.ts
//
// SERVER-ONLY. Turns the file choice in a deliverable request into the value stored in
// project_deliverables.file_url, or refuses. The Admin never types a storage path: a fileId points at an
// existing project_files row, and that row must belong to the deliverable project's own client and resolve to
// a valid object path under that client — the same helper the download routes use.

import { toProjectFilesObjectPath } from '@/lib/storage-path'
import type { DeliverableInput } from './operations-validation'

type Resolved = { ok: true; fileUrl: string | null | undefined } | { ok: false; error: string }

/** `undefined` fileUrl means "leave the stored value alone" (an update that names neither field). */
export async function resolveDeliverableFile(db: any, clientId: string | null, input: DeliverableInput): Promise<Resolved> {
  if (input.fileId) {
    if (!clientId) return { ok: false, error: 'This project has no client to take a file from.' }
    const { data } = await db.from('project_files').select('id, client_id, file_url').eq('id', input.fileId).eq('client_id', clientId).maybeSingle()
    if (!data || !toProjectFilesObjectPath(data.file_url, clientId)) {
      return { ok: false, error: 'That file is not available for this project’s client.' }
    }
    return { ok: true, fileUrl: data.file_url as string }
  }
  if (input.externalUrl) return { ok: true, fileUrl: input.externalUrl }
  if (input.fileId === null || input.externalUrl === null) return { ok: true, fileUrl: null }
  return { ok: true, fileUrl: undefined }
}
