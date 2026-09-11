// src/components/uploads/FileUploader.tsx
//
// The shared multi-file upload control. One component, one transport: it drives
// startUploadBatch() (signed TUS) and renders real per-file byte progress,
// retry state and a working cancel button.
//
// It knows nothing about buckets, paths or permissions — it passes a context
// and an optional target id to the server and renders what comes back.

'use client'

import { useCallback, useRef, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'
import {
  MAX_FILES_PER_BATCH,
  UPLOAD_SPECS,
  acceptAttribute,
  allowedExtensionLabel,
  type UploadContext,
} from '@/lib/uploads/upload-config'
import { startUploadBatch, type UploadItem } from '@/lib/uploads/tus-upload'

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]'

interface FileUploaderProps {
  context: UploadContext
  proposalId?: string
  projectId?: string | null
  /**
   * ADMIN ONLY. Upload into this client's workspace. Its presence selects the
   * admin gate on the server; its absence selects the client gate.
   */
  onBehalfOfClientId?: string | null
  /** Called once a batch settles, so the caller can refresh its list. */
  onComplete?: (savedCount: number) => void
  label?: string
  disabled?: boolean
}

const STATUS_LABEL: Record<UploadItem['status'], string> = {
  queued: 'Waiting',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  saving: 'Saving',
  done: 'Saved',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploader({
  context,
  proposalId,
  projectId,
  onBehalfOfClientId,
  onComplete,
  label = 'Upload files',
  disabled = false,
}: FileUploaderProps) {
  const spec = UPLOAD_SPECS[context]
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const [items, setItems] = useState<UploadItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files || [])
      if (inputRef.current) inputRef.current.value = ''
      if (selected.length === 0) return

      setError(null)

      if (selected.length > MAX_FILES_PER_BATCH) {
        setError(`You can upload up to ${MAX_FILES_PER_BATCH} files at a time.`)
        return
      }

      // A friendly local check only. The server re-validates every file, and
      // then re-verifies the stored object after upload — this just avoids
      // sending something that is certain to be rejected.
      const oversize = selected.find((f) => f.size > spec.maxBytes)
      if (oversize) {
        setError(`"${oversize.name}" is larger than ${spec.maxBytesLabel}.`)
        return
      }

      setBusy(true)
      setItems(
        selected.map((file, index) => ({
          key: `pending-${index}`,
          file,
          name: file.name,
          size: file.size,
          status: 'queued' as const,
          progress: 0,
        })),
      )

      const handle = startUploadBatch({
        context,
        proposalId,
        projectId,
        onBehalfOfClientId,
        files: selected,
        onChange: setItems,
      })
      cancelRef.current = handle.cancel

      const result = await handle.result
      cancelRef.current = null
      setBusy(false)

      if (result.error && result.savedCount === 0) setError(result.error)
      if (result.savedCount > 0) onComplete?.(result.savedCount)
    },
    [context, proposalId, projectId, onBehalfOfClientId, onComplete, spec.maxBytes, spec.maxBytesLabel],
  )

  const settled = !busy && items.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptAttribute(context)}
          onChange={handleSelect}
          className="hidden"
          id={`uploader-${context}-${onBehalfOfClientId || projectId || proposalId || 'self'}`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className={`inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--text-on-inverse)] transition hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
        >
          <SvgIcon name="upload" size={14} color="white" />
          {busy ? 'Uploading…' : label}
        </button>

        {busy && (
          <button
            type="button"
            onClick={() => cancelRef.current?.()}
            className={`rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] ${FOCUS_RING}`}
          >
            Cancel
          </button>
        )}

        {settled && (
          <button
            type="button"
            onClick={() => {
              setItems([])
              setError(null)
            }}
            className={`rounded-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)] ${FOCUS_RING}`}
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {allowedExtensionLabel(context)} · max {spec.maxBytesLabel} per file · up to{' '}
        {MAX_FILES_PER_BATCH} files
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--error)]">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {items.map((item) => {
            const pct = Math.round(item.progress * 100)
            const isError = item.status === 'failed'
            return (
              <li
                key={item.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      isError ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {STATUS_LABEL[item.status]}
                    {item.status === 'uploading' ? ` ${pct}%` : ''}
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ${
                      isError ? 'bg-[var(--error)]' : 'bg-[var(--accent)]'
                    }`}
                    style={{ width: `${item.status === 'done' ? 100 : pct}%` }}
                  />
                </div>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {isError && item.error ? item.error : formatBytes(item.size)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
