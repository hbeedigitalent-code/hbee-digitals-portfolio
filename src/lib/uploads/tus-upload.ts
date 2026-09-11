// src/lib/uploads/tus-upload.ts
//
// BROWSER-SIDE. The one upload transport in this application.
//
// Every file, at every size, goes through signed TUS resumable uploads, so
// progress, retry and cancellation behave identically for a 40 KB CSV and a
// 24 MB deck. There is no second code path to keep in sync.
//
// Why TUS and not uploadToSignedUrl(): the installed @supabase/storage-js
// (2.105.4) types `uploadToSignedUrl(path, token, body, fileOptions)` with
// FileOptions = { cacheControl, contentType, upsert, duplex, metadata, headers }
// — there is no progress callback anywhere in that surface. tus-js-client's
// `onProgress(bytesSent, bytesTotal)` is the only real per-file progress
// available, and TUS additionally survives a dropped connection.
//
// CREDENTIALS: the browser holds a short-lived signed upload token, issued by
// the server for ONE server-selected object path, sent in `x-signature`. No
// service-role key is ever present here, and the anon key below is the same
// public key the Supabase client already ships to the browser.
//
// This module chooses nothing about placement or permissions. It asks the
// server where to put bytes, puts them there, and then asks the server to
// commit — by upload ID, never by path.

'use client'

import * as tus from 'tus-js-client'
import type { UploadContext } from '@/lib/uploads/upload-config'

/** Supabase's TUS implementation currently REQUIRES exactly 6 MB chunks. */
const CHUNK_SIZE = 6 * 1024 * 1024

/** Files uploaded in parallel. Keeps a large batch from saturating the uplink. */
const CONCURRENCY = 2

const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000]

export type UploadItemStatus =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'saving'
  | 'done'
  | 'failed'
  | 'cancelled'

export interface UploadItem {
  /** Stable local id, assigned before anything is sent. */
  key: string
  file: File
  name: string
  size: number
  status: UploadItemStatus
  /** 0..1 */
  progress: number
  error?: string
  /** Server upload id, once initiate has responded. */
  uploadId?: string
  /** Metadata row id, once finalize has committed. */
  fileId?: string
}

export interface StartUploadOptions {
  context: UploadContext
  proposalId?: string
  projectId?: string | null
  /**
   * ADMIN ONLY. Upload into this client's workspace. Supplying it selects the
   * admin gate on the server; omitting it selects the client gate.
   */
  onBehalfOfClientId?: string | null
  files: File[]
  /** Called on every state or progress change, with a fresh array each time. */
  onChange?: (items: UploadItem[]) => void
}

export interface UploadBatchResult {
  ok: boolean
  batchId?: string
  items: UploadItem[]
  /** Set when the batch failed as a whole (authorization, configuration, network). */
  error?: string
  savedCount: number
}

export interface UploadBatchHandle {
  result: Promise<UploadBatchResult>
  cancel: () => void
}

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Starts a batch and returns immediately with a handle.
 *
 * `cancel()` aborts every in-flight upload, asks the TUS server to terminate
 * the partial upload, and settles the sessions so the batch closes at once.
 *
 * It does NOT promise that nothing remains in the bucket. The TUS termination
 * is best-effort, and a signed upload token stays valid for up to 24 hours, so
 * any object that did land is removed later by the scheduled sweep — not
 * immediately. The UI must not claim otherwise.
 */
export function startUploadBatch(options: StartUploadOptions): UploadBatchHandle {
  const items: UploadItem[] = options.files.map((file) => ({
    key: newKey(),
    file,
    name: file.name,
    size: file.size,
    status: 'queued',
    progress: 0,
  }))

  let cancelled = false
  let batchId: string | null = null
  const active = new Set<tus.Upload>()

  const emit = () => options.onChange?.(items.map((i) => ({ ...i })))

  const cancel = () => {
    cancelled = true
    for (const upload of active) {
      // `true` asks the TUS server to terminate the partial upload. Best-effort:
      // it can fail, and it says nothing about whether an object already exists.
      upload.abort(true).catch(() => {})
    }
    active.clear()

    const cancelledIds: string[] = []
    for (const item of items) {
      if (item.status === 'queued' || item.status === 'uploading') {
        item.status = 'cancelled'
        if (item.uploadId) cancelledIds.push(item.uploadId)
      }
    }
    emit()

    // Settle the sessions server-side so the batch closes NOW rather than
    // waiting for the 26-hour sweep. This does not delete anything: a signed
    // upload token can still be live, so object removal stays with the sweep.
    if (batchId && cancelledIds.length > 0) {
      void fetch('/api/uploads/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          context: options.context,
          proposalId: options.proposalId,
          projectId: options.projectId || undefined,
          onBehalfOfClientId: options.onBehalfOfClientId || undefined,
          uploadIds: cancelledIds,
          status: 'canceled',
        }),
      }).catch(() => {})
    }
  }

  const setBatchId = (id: string) => {
    batchId = id
  }

  const result = run(options, items, active, () => cancelled, emit, setBatchId)

  return { result, cancel }
}

async function run(
  options: StartUploadOptions,
  items: UploadItem[],
  active: Set<tus.Upload>,
  isCancelled: () => boolean,
  emit: () => void,
  setBatchId: (id: string) => void,
): Promise<UploadBatchResult> {
  const fail = (error: string): UploadBatchResult => {
    for (const item of items) {
      if (item.status === 'queued') item.status = 'failed'
    }
    emit()
    return { ok: false, items, error, savedCount: 0 }
  }

  // ---- 1. Ask the server to authorize the batch and issue tokens ---------
  let plan: any
  try {
    const response = await fetch('/api/uploads/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: options.context,
        proposalId: options.proposalId,
        projectId: options.projectId || undefined,
        onBehalfOfClientId: options.onBehalfOfClientId || undefined,
        files: items.map((i) => ({
          fileName: i.file.name,
          size: i.file.size,
          contentType: i.file.type || '',
        })),
      }),
    })
    plan = await response.json().catch(() => ({}))
    if (!response.ok) {
      return fail(plan?.error || 'Upload could not be started.')
    }
  } catch {
    return fail('Upload could not be started. Please check your connection.')
  }

  if (isCancelled()) return { ok: false, items, error: 'Cancelled.', savedCount: 0 }

  setBatchId(plan.batchId)

  // Server order matches request order.
  plan.uploads.forEach((upload: any, index: number) => {
    if (items[index]) items[index].uploadId = upload.uploadId
  })
  emit()

  // ---- 2. Send the bytes -------------------------------------------------
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      if (isCancelled()) return

      const item = items[index]
      const upload = plan.uploads[index]
      if (!upload) {
        item.status = 'failed'
        item.error = 'This file was not authorized.'
        emit()
        continue
      }

      item.status = 'uploading'
      emit()

      try {
        await sendOne(item, upload, plan.endpoint, anonKey, active, isCancelled, emit)
        item.status = 'uploaded'
        item.progress = 1
      } catch (error) {
        if (isCancelled()) {
          item.status = 'cancelled'
        } else {
          item.status = 'failed'
          item.error = error instanceof Error ? error.message : 'Upload failed.'
        }
      }
      emit()
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()),
  )

  if (isCancelled()) return { ok: false, items, error: 'Cancelled.', savedCount: 0 }

  // ---- 3. Commit — by UPLOAD ID, never by path --------------------------
  const uploaded = items.filter((i) => i.status === 'uploaded' && i.uploadId)
  if (uploaded.length === 0) {
    return { ok: false, items, error: 'No files were uploaded.', savedCount: 0 }
  }

  for (const item of uploaded) {
    item.status = 'saving'
  }
  emit()

  try {
    const response = await fetch('/api/uploads/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: plan.batchId,
        context: options.context,
        proposalId: options.proposalId,
        projectId: options.projectId || undefined,
        onBehalfOfClientId: options.onBehalfOfClientId || undefined,
        uploadIds: uploaded.map((i) => i.uploadId),
      }),
    })
    const saved = await response.json().catch(() => ({}))

    if (!response.ok) {
      for (const item of uploaded) {
        item.status = 'failed'
        item.error = saved?.error || 'The file could not be saved.'
      }
      emit()
      return { ok: false, items, error: saved?.error || 'Files could not be saved.', savedCount: 0 }
    }

    for (const outcome of saved.files || []) {
      const item = items.find((i) => i.uploadId === outcome.uploadId)
      if (!item) continue
      if (outcome.status === 'failed') {
        item.status = 'failed'
        item.error = outcome.reason
      } else {
        item.status = 'done'
        item.fileId = outcome.fileId
      }
    }
    emit()

    return {
      ok: items.some((i) => i.status === 'done'),
      batchId: plan.batchId,
      items,
      savedCount: saved.saved || 0,
    }
  } catch {
    for (const item of uploaded) {
      item.status = 'failed'
      item.error = 'The file could not be saved. Please try again.'
    }
    emit()
    return { ok: false, items, error: 'Files could not be saved.', savedCount: 0 }
  }
}

function sendOne(
  item: UploadItem,
  upload: any,
  endpoint: string,
  anonKey: string,
  active: Set<tus.Upload>,
  isCancelled: () => boolean,
  emit: () => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const headers: Record<string, string> = {
      // The server-issued signed upload token. Supabase's TUS hook verifies
      // this instead of a JWT, so the upload is authorized for exactly one
      // object path and nothing else.
      'x-signature': upload.token,
    }
    if (anonKey) headers.apikey = anonKey

    const tusUpload = new tus.Upload(item.file, {
      endpoint,
      headers,
      chunkSize: CHUNK_SIZE,
      retryDelays: RETRY_DELAYS,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: upload.bucket,
        objectName: upload.objectName,
        contentType: upload.contentType,
        cacheControl: '3600',
      },
      onProgress(bytesSent, bytesTotal) {
        item.progress = bytesTotal > 0 ? bytesSent / bytesTotal : 0
        emit()
      },
      onShouldRetry(_error, _attempt, _options) {
        // Never keep retrying something the user has cancelled.
        return !isCancelled()
      },
      onError(error) {
        active.delete(tusUpload)
        reject(error instanceof Error ? error : new Error('Upload failed.'))
      },
      onSuccess() {
        active.delete(tusUpload)
        resolve()
      },
    })

    active.add(tusUpload)
    if (isCancelled()) {
      active.delete(tusUpload)
      reject(new Error('Cancelled.'))
      return
    }
    tusUpload.start()
  })
}
