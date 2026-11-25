'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { findAssetsByChecksum } from '@/lib/media/media-library'
import {
  BULK_MAX_FILES, BULK_MAX_TOTAL_BYTES, acceptFiles, applyCategory, guessKind, isFinished, markRepeats, metadataProblems, newQueueItem, offerAssetToRepeats,
  prepareQueueFile, queueState, queueSummary, runQueue, type BatchDefaults, type QueueItem, type QueueState,
} from '@/lib/media/bulk-queue'
import { analyseImage, decodeForEdit, editedFileName, editedMime, renderCrop } from '@/lib/media/media-edit'
import { VIDEO_GUIDANCE, videoWarnings, type VideoUploadHandle } from '@/lib/media/media-video'
import { MEDIA_IMAGE_ACCEPT } from '@/lib/media/media-validation'
import { CATEGORY_LABELS, IMAGE_CATEGORIES, VIDEO_CATEGORIES, formatBytes, isImageCategory, isVideoCategory, type MediaAsset, type MediaKind } from '@/lib/media/media-types'
import PosterField from './PosterField'

const MediaImageEditor = dynamic(() => import('./MediaImageEditor'), { ssr: false, loading: () => <p role="status" className="text-sm text-[var(--text-secondary)]">Opening editor…</p> })

const field = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const primary = 'rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50'
const ACCEPT = `${MEDIA_IMAGE_ACCEPT},video/mp4,video/webm`

const STATE_LABELS: Record<QueueState, string> = {
  checking: 'Checking…', ready: 'Ready', attention: 'Needs attention', duplicate: 'Duplicate', uploading: 'Uploading', saving: 'Saving',
  uploaded: 'Uploaded', existing: 'Using existing', failed: 'Failed', cancelled: 'Cancelled',
}

export interface BulkUploaderProps {
  /** Called after each file that is added to (or picked from) the library. */
  onAsset: (asset: MediaAsset) => void
}

/**
 * Upload one file or many (images and video together). Each file is checked, described, edited and uploaded on its own.
 * Nothing is uploaded until the owner presses the upload button, and nothing is ever deleted.
 */
export default function BulkUploader({ onAsset }: BulkUploaderProps) {
  const inputId = useId()
  const [items, setItems] = useState<QueueItem[]>([])
  const itemsRef = useRef<QueueItem[]>([])
  const [defaults, setDefaults] = useState<BatchDefaults>({ image: 'general', video: 'video' })
  const [notices, setNotices] = useState<string[]>([])
  const [editing, setEditing] = useState('')
  const [dragging, setDragging] = useState(false)
  const [run, setRun] = useState<{ done: number; total: number } | null>(null)
  const [trimming, setTrimming] = useState(false)
  const preparing = useRef(Promise.resolve())
  const uploading = useRef(false)
  const runKeys = useRef<string[]>([])
  const current = useRef<{ key: string; handle: VideoUploadHandle | null }>({ key: '', handle: null })
  const urls = useRef(new Map<File, string>())
  const inputRef = useRef<HTMLInputElement | null>(null)

  /** The ref is updated first so async work always reads the latest queue. */
  const commit = (change: (previous: QueueItem[]) => QueueItem[]) => { itemsRef.current = markRepeats(change(itemsRef.current)); setItems(itemsRef.current) }
  const update = (key: string, patch: Partial<QueueItem>) => commit((previous) => previous.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  const get = (key: string) => itemsRef.current.find((item) => item.key === key)
  const urlFor = (file: File) => { let url = urls.current.get(file); if (!url) { url = URL.createObjectURL(file); urls.current.set(file, url) } return url }

  useEffect(() => {
    const held = urls.current
    return () => { current.current.handle?.cancel(); held.forEach((url) => URL.revokeObjectURL(url)) }
  }, [])
  useEffect(() => {
    if (!run) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [run])

  /** Validate and hash one file, then look for the same bytes in the library. */
  async function check(key: string, file: File, kind: MediaKind) {
    try {
      const prepared = await prepareQueueFile(file, kind)
      let duplicates: MediaAsset[] = []
      try { duplicates = await findAssetsByChecksum(supabase, prepared.checksum) }
      catch { setNotices((previous) => [...new Set([...previous, 'Could not check for duplicates. Review the library before uploading.'])]) }
      update(key, { prepared, duplicates, invalid: '', phase: 'idle', allowDuplicate: false })
    } catch (error) {
      update(key, { prepared: null, invalid: errorText(error), phase: 'idle' })
    }
  }
  /** One file at a time: a queue of large files is never read into memory all at once. */
  const enqueueCheck = (key: string, file: File, kind: MediaKind) => { preparing.current = preparing.current.then(() => check(key, file, kind)); return preparing.current }

  async function add(list: FileList | File[] | null) {
    const files = list ? Array.from(list) : []
    if (!files.length) return
    const { accepted, rejected } = acceptFiles(itemsRef.current, files)
    setNotices(rejected)
    if (inputRef.current) inputRef.current.value = ''
    for (const file of accepted) {
      const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
      const kind = guessKind(file, head)
      const key = crypto.randomUUID()
      commit((previous) => [...previous, newQueueItem(file, key, kind, defaults)])
      void enqueueCheck(key, file, kind)
    }
  }

  async function upload(keys: string[]) {
    if (uploading.current || !keys.length) return
    uploading.current = true
    runKeys.current = keys
    setRun({ done: 0, total: keys.length })
    try {
      for (let i = 0; i < keys.length; i += 1) {
        current.current = { key: keys[i], handle: null }
        const added = await runQueue(supabase, [keys[i]], get, update, { token: () => crypto.randomUUID(), onHandle: (handle) => { current.current.handle = handle } })
        for (const asset of added) {
          onAsset(asset)
          // A later file with the same bytes can now use the asset that was just added, instead of uploading it again.
          commit((previous) => offerAssetToRepeats(previous, asset))
        }
        setRun({ done: i + 1, total: keys.length })
      }
    } finally { uploading.current = false; runKeys.current = []; current.current = { key: '', handle: null }; setRun(null) }
  }

  function cancel(item: QueueItem) {
    const inFlight = current.current.key === item.key ? current.current.handle : null
    update(item.key, { phase: 'cancelled', progress: null, error: '' })
    inFlight?.cancel()
  }
  /** Stop what has not been sent yet. An image already on the wire cannot be interrupted, so it is left to finish. */
  const cancelRemaining = () => itemsRef.current
    .filter((item) => runKeys.current.includes(item.key) && (item.phase === 'idle' || item.phase === 'failed' || (item.phase === 'uploading' && item.kind === 'video')))
    .forEach(cancel)
  const dismiss = (key: string) => { if (editing === key) setEditing(''); commit((previous) => previous.filter((item) => item.key !== key)) }

  /** Replace a queued file with an edited or restored one; it goes through full validation and a new checksum again. */
  async function replaceFile(item: QueueItem, file: File) {
    update(item.key, { file, phase: 'checking', error: '', storedPath: '' })
    await enqueueCheck(item.key, file, item.kind)
  }

  /** Optional batch action: transparent margins only. Solid or white backgrounds are never touched here. */
  async function autoTrim() {
    if (trimming) return
    setTrimming(true)
    const changed: string[] = []
    try {
      const eligible = itemsRef.current.filter((item) => item.kind === 'image' && item.phase === 'idle' && !item.invalid && item.file === item.original && !item.storedPath && item.prepared?.mime !== 'image/jpeg')
      for (const item of eligible) {
        let image: Awaited<ReturnType<typeof decodeForEdit>> | null = null
        try {
          image = await decodeForEdit(item.file)
          const rect = analyseImage(image).transparentTrim
          if (!rect) continue
          const mime = editedMime(item.prepared?.mime ?? 'image/png')
          const blob = await renderCrop(image, rect, mime)
          await replaceFile(item, new File([blob], editedFileName(item.file.name, mime), { type: mime }))
          changed.push(item.file.name)
        } catch { /* leave this file as it is */ }
        finally { image?.close() }
      }
    } finally {
      setTrimming(false)
      setNotices([changed.length ? `Trimmed transparent space from: ${changed.join(', ')}. Use “Use original” on any file to undo.` : 'No file had transparent margins to trim. Nothing was changed.'])
    }
  }

  const summary = queueSummary(items)
  const readyKeys = items.filter((item) => queueState(item) === 'ready').map((item) => item.key)
  const busy = !!run || trimming
  const hasImages = items.some((item) => item.kind === 'image' && !isFinished(item))
  const hasVideos = items.some((item) => item.kind === 'video' && !isFinished(item))
  const edited = items.find((item) => item.key === editing)

  return <div className="space-y-4">
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void add(event.dataTransfer.files) }}
      className={`rounded-xl border-2 border-dashed p-5 text-center ${dragging ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
      <input ref={inputRef} id={inputId} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(event) => void add(event.target.files)} />
      <label htmlFor={inputId} className={`${button} inline-block cursor-pointer`}>Choose files</label>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">or drag and drop images and videos here: up to {BULK_MAX_FILES} files, {BULK_MAX_TOTAL_BYTES / 1048576} MB per batch</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Images: PNG, JPEG, WebP or AVIF up to 8 MB (no SVG). {VIDEO_GUIDANCE}</p>
    </div>

    {notices.length > 0 && <ul role="status" className="space-y-1 rounded-lg border border-[var(--accent)]/30 p-3 text-sm text-[var(--accent)]">{notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>}

    {items.length > 0 && <>
      <section aria-label="Batch defaults" className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] p-3">
        {hasImages && <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Category for images<select className={field} value={defaults.image} onChange={(event) => { const value = event.target.value; if (isImageCategory(value)) setDefaults((previous) => ({ ...previous, image: value })) }}>
            {IMAGE_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
          <button type="button" className={button} disabled={busy} onClick={() => commit((previous) => applyCategory(previous, 'image', defaults.image))}>Apply to all images</button>
          <button type="button" className={button} disabled={busy || summary.checking > 0} onClick={() => void autoTrim()}>{trimming ? 'Trimming…' : 'Auto-trim transparent space for eligible files'}</button>
        </div>}
        {hasVideos && <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Category for videos<select className={field} value={defaults.video} onChange={(event) => { const value = event.target.value; if (isVideoCategory(value)) setDefaults((previous) => ({ ...previous, video: value })) }}>
            {VIDEO_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
          <button type="button" className={button} disabled={busy} onClick={() => commit((previous) => applyCategory(previous, 'video', defaults.video))}>Apply to all videos</button>
        </div>}
      </section>

      {edited && edited.prepared && <MediaImageEditor key={edited.key} file={edited.file} mime={edited.prepared.mime} onCancel={() => setEditing('')} onApply={(file) => { setEditing(''); void replaceFile(edited, file) }} />}

      <ul className="space-y-3" aria-label="Upload queue">
        {items.map((item) => <QueueRow key={item.key} item={item} url={urlFor(item.file)} busy={busy} editing={editing === item.key}
          onChange={(patch) => update(item.key, patch)}
          onEdit={() => setEditing(item.key)}
          onRestore={() => void replaceFile(item, item.original)}
          onCancel={() => cancel(item)}
          onRetry={() => { update(item.key, { phase: 'failed' }); void upload([item.key]) }}
          onRequeue={() => update(item.key, { phase: 'idle', error: '' })}
          onUseExisting={(asset) => { update(item.key, { phase: 'existing', asset }); onAsset(asset) }}
          onDismiss={() => dismiss(item.key)} />)}
      </ul>

      <div className="sticky bottom-0 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <p className="text-sm text-[var(--text-secondary)]" role="status">
          {summary.total} file{summary.total === 1 ? '' : 's'}: {summary.ready} ready, {summary.attention} need attention, {summary.duplicate} duplicate, {summary.uploaded} done, {summary.failed} failed{summary.cancelled ? `, ${summary.cancelled} cancelled` : ''}{summary.checking ? `, ${summary.checking} checking` : ''}
        </p>
        {run && <div><progress className="h-2 w-full" max={run.total} value={run.done} aria-label="Batch progress" /><p className="text-xs text-[var(--text-muted)]">{run.done} of {run.total} files finished</p></div>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={busy || !readyKeys.length} onClick={() => void upload(readyKeys)}>{run ? 'Uploading…' : `Upload ${readyKeys.length} ready file${readyKeys.length === 1 ? '' : 's'}`}</button>
          {run && <button type="button" className={button} onClick={cancelRemaining}>Cancel remaining</button>}
          {!run && items.some(isFinished) && <button type="button" className={button} onClick={() => commit((previous) => previous.filter((item) => !isFinished(item)))}>Clear finished from list</button>}
        </div>
      </div>
    </>}
  </div>
}

interface QueueRowProps {
  item: QueueItem; url: string; busy: boolean; editing: boolean
  onChange: (patch: Partial<QueueItem>) => void; onEdit: () => void; onRestore: () => void; onCancel: () => void
  onRetry: () => void; onRequeue: () => void; onUseExisting: (asset: MediaAsset) => void; onDismiss: () => void
}

function QueueRow({ item, url, busy, editing, onChange, onEdit, onRestore, onCancel, onRetry, onRequeue, onUseExisting, onDismiss }: QueueRowProps) {
  const [preview, setPreview] = useState(false)
  const state = queueState(item)
  const info = item.prepared
  const locked = ['uploading', 'saving', 'uploaded', 'existing'].includes(state) || state === 'checking'
  const problems = item.invalid ? [item.invalid] : info && state === 'attention' ? metadataProblems(item) : []
  const warnings = item.kind === 'video' && info && !locked ? videoWarnings(item.category, info, !!item.poster) : []
  const duplicate = state === 'duplicate'
  const tone = state === 'failed' || item.invalid ? 'text-red-500' : state === 'duplicate' || state === 'attention' ? 'text-amber-500' : 'text-[var(--accent)]'

  return <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3" data-state={state}>
    <div className="flex flex-wrap gap-3">
      <span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e9edf2] p-1">
        {item.kind === 'video' ? <span className="text-xs font-semibold text-gray-600">▶ Video</span>
          // eslint-disable-next-line @next/next/no-img-element
          : item.invalid ? <span className="text-xs text-gray-600">No preview</span> : <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="break-all text-sm font-semibold text-[var(--text-primary)]">{item.file.name}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {item.kind === 'video' ? 'Video' : 'Image'}{info ? ` · ${info.mime}` : ''} · {formatBytes(item.file.size)}
          {info?.width && info.height ? ` · ${info.width}×${info.height}` : ''}{info?.duration != null ? ` · ${Math.round(info.duration)} s` : ''}
          {item.file !== item.original ? ' · edited' : ''}
        </p>
        <p className={`text-sm font-bold ${tone}`}>{STATE_LABELS[state]}{state === 'uploading' && item.progress !== null ? ` ${Math.round(item.progress * 100)}%` : ''}</p>
        {state === 'uploading' && <progress className="h-2 w-full max-w-xs" aria-label={`Uploading ${item.file.name}`} {...(item.progress !== null ? { max: 1, value: item.progress } : {})} />}
        {item.error && <p role="alert" className="text-xs text-red-500">{item.error}</p>}
        {problems.length > 0 && <ul className="text-xs text-amber-500">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
        {warnings.length > 0 && <ul className="text-xs text-[var(--text-muted)]">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        {duplicate && <div className="mt-1 space-y-1 text-xs text-[var(--text-primary)]">
          <p className="font-semibold">Already exists{item.sameAsEarlier && !item.duplicates.length ? ' earlier in this batch' : ' in the Media Library'}.</p>
          <div className="flex flex-wrap gap-2">
            {item.duplicates.map((asset) => asset.status === 'active'
              ? <button key={asset.id} type="button" className={button} onClick={() => onUseExisting(asset)}>Use existing asset: {asset.title}</button>
              : <span key={asset.id}>{asset.title} (archived)</span>)}
            <button type="button" className={button} onClick={() => onChange({ allowDuplicate: true })}>Upload anyway</button>
          </div>
        </div>}
        {item.storedPath && state === 'failed' && <p className="text-xs text-[var(--text-muted)]">The file is stored at {item.storedPath}. “Retry saving” registers it without sending it again.</p>}
      </div>
      <div className="flex flex-wrap content-start gap-2">
        {item.kind === 'image' && !item.invalid && !locked && !item.storedPath && <button type="button" className={button} disabled={busy || editing} onClick={onEdit}>Trim or crop</button>}
        {item.file !== item.original && !locked && !item.storedPath && <button type="button" className={button} disabled={busy} onClick={onRestore}>Use original</button>}
        {item.kind === 'video' && !item.invalid && <button type="button" className={button} aria-expanded={preview} onClick={() => setPreview((value) => !value)}>{preview ? 'Hide preview' : 'Preview'}</button>}
        {state === 'failed' && <button type="button" className={button} disabled={busy} onClick={onRetry}>{item.storedPath ? 'Retry saving' : 'Retry'}</button>}
        {state === 'cancelled' && <button type="button" className={button} disabled={busy} onClick={onRequeue}>Retry</button>}
        {((state === 'uploading' && item.kind === 'video') || (busy && (state === 'ready'))) && <button type="button" className={button} onClick={onCancel}>Cancel</button>}
        {!['uploading', 'saving'].includes(state) && !(busy && state === 'ready') && <button type="button" className={button} onClick={onDismiss} aria-label={`Remove ${item.file.name} from the list`}>Remove from list</button>}
      </div>
    </div>

    {preview && item.kind === 'video' && <video src={url} poster={item.poster?.public_url} controls muted playsInline preload="metadata" aria-label={`Preview of ${item.file.name}`} className="mt-3 max-h-72 w-full rounded-lg bg-black" />}

    {!item.invalid && !isFinished(item) && <fieldset disabled={locked} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Name *<input className={field} value={item.title} maxLength={160} onChange={(event) => onChange({ title: event.target.value })} /></label>
      <label className="block text-sm">Category *<select className={field} value={item.category} disabled={!!item.storedPath} onChange={(event) => onChange({ category: event.target.value as QueueItem['category'] })}>
        {(item.kind === 'video' ? VIDEO_CATEGORIES : IMAGE_CATEGORIES).map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
      {item.kind === 'image' && <>
        <label className="block text-sm">Alt text{item.decorative ? '' : ' *'}<input className={field} value={item.decorative ? '' : item.altText} disabled={item.decorative} maxLength={300}
          placeholder={item.decorative ? 'Not needed for a decorative image' : 'Describe what the image shows'} onChange={(event) => onChange({ altText: event.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.decorative} onChange={(event) => onChange({ decorative: event.target.checked })} />Decorative: adds no information</label>
      </>}
      <label className="block text-sm sm:col-span-2">Caption (optional)<input className={field} value={item.caption} maxLength={1000} onChange={(event) => onChange({ caption: event.target.value })} /></label>
      {item.kind === 'video' && <div className="sm:col-span-2"><PosterField poster={item.poster} required={item.category === 'bgc_video'} suggestedTitle={`${item.title} poster`} disabled={locked} onChange={(poster) => onChange({ poster })} /></div>}
    </fieldset>}
  </li>
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Something went wrong. Please try again.'
}
