'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { findAssetsByChecksum } from '@/lib/media/media-library'
import { sha256Hex } from '@/lib/media/media-checksum'
import {
  VIDEO_ACCEPT, VIDEO_GUIDANCE, readVideoMetadata, registerVideoAsset, startVideoUpload, validateVideoBytes, validateVideoMetadata,
  videoWarnings, type ValidatedVideo, type VideoMetadataErrors, type VideoUploadHandle,
} from '@/lib/media/media-video'
import { CATEGORY_LABELS, VIDEO_CATEGORIES, formatBytes, isVideoCategory, type MediaAsset, type VideoCategory } from '@/lib/media/media-types'
import { defaultTitleFromFileName } from '@/lib/media/media-validation'
import PosterField from './PosterField'

const field = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const primary = 'rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50'

type Phase = 'idle' | 'checking' | 'ready' | 'uploading' | 'saving'
type Prepared = ValidatedVideo & { duration: number | null; width: number | null; height: number | null; checksum: string | null }

export interface VideoUploaderProps {
  defaultCategory?: VideoCategory
  onUploaded: (asset: MediaAsset) => void
  onUseExisting?: (asset: MediaAsset) => void
}

/**
 * Upload one short, optimised video to the Media Library: validate the bytes, confirm the browser can decode it, choose a
 * poster, upload resumably with progress / cancel / retry, then register the asset. Nothing is ever deleted.
 */
export default function VideoUploader({ defaultCategory = 'video', onUploaded, onUseExisting }: VideoUploaderProps) {
  const inputId = useId()
  const [phase, setPhase] = useState<Phase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [duplicates, setDuplicates] = useState<MediaAsset[]>([])
  const [category, setCategory] = useState<VideoCategory>(defaultCategory)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [poster, setPoster] = useState<MediaAsset | null>(null)
  const [errors, setErrors] = useState<VideoMetadataErrors>({})
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  /** Set once the bytes are in storage, so a failed registration is retried without uploading again. */
  const [storedPath, setStoredPath] = useState('')
  const busy = useRef(false)
  const handle = useRef<VideoUploadHandle | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  useEffect(() => () => handle.current?.cancel(), [])

  function reset() {
    handle.current = null
    setPhase('idle'); setFile(null); setPrepared(null); setPreviewUrl(''); setDuplicates([]); setTitle(''); setCaption('')
    setPoster(null); setErrors({}); setProgress(0); setStoredPath(''); setFailed(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function choose(next: File | undefined) {
    if (!next || busy.current) return
    busy.current = true
    setMessage(''); setErrors({}); setDuplicates([]); setStoredPath(''); setProgress(0); setFailed(false); setPhase('checking')
    try {
      const head = new Uint8Array(await next.slice(0, 64).arrayBuffer())
      const validated = validateVideoBytes({ size: next.size, declaredType: next.type, head, fileName: next.name })
      const decoded = await readVideoMetadata(next)
      const checksum = await sha256Hex(await next.arrayBuffer())
      let matches: MediaAsset[] = []
      try { matches = await findAssetsByChecksum(supabase, checksum) } catch (error) { setMessage(`Error: ${errorText(error)}`) }
      setFile(next); setPrepared({ ...validated, ...decoded, checksum }); setDuplicates(matches)
      setPreviewUrl(URL.createObjectURL(next)); setTitle(defaultTitleFromFileName(next.name)); setPhase('ready')
    } catch (error) {
      setFile(null); setPrepared(null); setPhase('idle'); setMessage(`Error: ${errorText(error)}`)
      if (inputRef.current) inputRef.current.value = ''
    } finally { busy.current = false }
  }

  async function upload() {
    if (!file || !prepared || busy.current) return
    const meta = { title, category, caption }
    const problems = validateVideoMetadata(meta, { hasPoster: !!poster })
    setErrors(problems)
    if (Object.keys(problems).length) { setMessage('Error: Complete the highlighted fields.'); return }
    busy.current = true; setMessage(''); setFailed(false)
    let objectPath = storedPath
    try {
      if (!objectPath) {
        setPhase('uploading'); setProgress(0)
        // A fresh path for every attempt: nothing is ever overwritten and a half-sent attempt cannot collide.
        const current = startVideoUpload(supabase, { file, mime: prepared.mime as 'video/mp4' | 'video/webm', category, token: crypto.randomUUID(), onProgress: setProgress })
        handle.current = current
        await current.promise
        objectPath = current.objectPath
        setStoredPath(objectPath)
      }
      setPhase('saving')
      const asset = await registerVideoAsset(supabase, {
        objectPath, mime: prepared.mime as 'video/mp4' | 'video/webm', category, size: prepared.size, meta,
        width: prepared.width, height: prepared.height, duration: prepared.duration, checksum: prepared.checksum, posterAssetId: poster?.id ?? null,
      })
      reset(); setMessage('Uploaded and added to the Media Library.')
      onUploaded(asset)
    } catch (error) { setPhase('ready'); setFailed(true); setMessage(`Error: ${errorText(error)}`) }
    finally { busy.current = false; handle.current = null }
  }

  const cancelUpload = () => { handle.current?.cancel() }
  const working = phase === 'checking' || phase === 'uploading' || phase === 'saving'
  const isError = message.startsWith('Error:')
  const percent = Math.round(progress * 100)
  const warnings = prepared ? videoWarnings(category, prepared, !!poster) : []

  return <div className="space-y-4">
    {phase === 'idle' || phase === 'checking' ? <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center">
      <input ref={inputRef} id={inputId} type="file" accept={VIDEO_ACCEPT} className="sr-only" disabled={working} onChange={(event) => void choose(event.target.files?.[0])} />
      <label htmlFor={inputId} className={`${button} inline-block cursor-pointer`}>{phase === 'checking' ? 'Checking video…' : 'Choose a video'}</label>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{VIDEO_GUIDANCE}</p>
    </div> : null}

    {message && <p role={isError ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${isError ? 'border-red-500/30 text-red-500' : 'border-[var(--accent)]/30 text-[var(--accent)]'}`}>{message}</p>}

    {file && prepared && phase !== 'idle' && phase !== 'checking' && <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div>
        {previewUrl && <video src={previewUrl} poster={poster?.public_url} controls muted playsInline preload="metadata" aria-label="Preview of the selected video" className="w-full rounded-lg bg-black" />}
        <dl className="mt-2 space-y-0.5 text-xs text-[var(--text-muted)]">
          <div><dt className="inline font-semibold">File: </dt><dd className="inline break-all">{file.name}</dd></div>
          <div><dt className="inline font-semibold">Size: </dt><dd className="inline">{formatBytes(prepared.size)}</dd></div>
          <div><dt className="inline font-semibold">Duration: </dt><dd className="inline">{prepared.duration === null ? 'Unknown' : `${Math.round(prepared.duration)} s`}</dd></div>
          <div><dt className="inline font-semibold">Dimensions: </dt><dd className="inline">{prepared.width && prepared.height ? `${prepared.width} × ${prepared.height}px` : 'Unknown'}</dd></div>
          <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{prepared.mime}</dd></div>
        </dl>
        {warnings.length > 0 && <ul className="mt-2 space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-[var(--text-primary)]">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      </div>

      <div className="min-w-0 space-y-3">
        {duplicates.length > 0 && <div role="alert" className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold text-[var(--text-primary)]">This file already exists in the Media Library.</p>
          <ul className="space-y-1">{duplicates.map((asset) => <li key={asset.id} className="flex flex-wrap items-center gap-2"><span>{asset.title}{asset.status === 'archived' ? ' (archived)' : ''}</span>
            {onUseExisting && asset.status === 'active' && <button type="button" className={button} disabled={working} onClick={() => { reset(); onUseExisting(asset) }}>Use existing asset</button>}</li>)}</ul>
        </div>}
        <fieldset disabled={working} className="space-y-3">
          <label className="block text-sm">Name *<input className={field} value={title} maxLength={160} aria-invalid={!!errors.title} onChange={(event) => setTitle(event.target.value)} />
            {errors.title && <span role="alert" className="mt-1 block text-xs text-red-500">{errors.title}</span>}</label>
          <label className="block text-sm">Category *<select className={field} value={category} disabled={!!storedPath} onChange={(event) => { if (isVideoCategory(event.target.value)) setCategory(event.target.value) }}>
            {VIDEO_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
          <label className="block text-sm">Caption (optional)<input className={field} value={caption} maxLength={1000} onChange={(event) => setCaption(event.target.value)} /></label>
          <PosterField poster={poster} required={category === 'bgc_video'} error={errors.poster} suggestedTitle={title ? `${title} poster` : ''} disabled={working} onChange={setPoster} />
        </fieldset>

        {(phase === 'uploading' || phase === 'saving') && <div className="space-y-1" role="status">
          <progress className="h-2 w-full" max={100} value={phase === 'saving' ? 100 : percent} aria-label="Upload progress" />
          <p className="text-xs text-[var(--text-muted)]">{phase === 'saving' ? 'Saving to the library…' : `Uploading… ${percent}%`}</p>
        </div>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={working} onClick={() => void upload()}>
            {storedPath ? 'Retry saving' : failed ? 'Retry upload' : duplicates.length ? 'Upload anyway' : 'Upload to Media Library'}</button>
          {phase === 'uploading' ? <button type="button" className={button} onClick={cancelUpload}>Cancel upload</button>
            : <button type="button" className={button} disabled={working} onClick={reset}>Discard selection</button>}
        </div>
      </div>
    </div>}
  </div>
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Something went wrong. Please try again.'
}
