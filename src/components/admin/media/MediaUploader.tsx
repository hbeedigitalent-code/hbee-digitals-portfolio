'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { findAssetsByChecksum, uploadImageAsset } from '@/lib/media/media-library'
import { prepareImageFile, type PreparedImage } from '@/lib/media/media-prepare'
import { CATEGORY_LABELS, IMAGE_CATEGORIES, formatBytes, isImageCategory, type ImageCategory, type MediaAsset } from '@/lib/media/media-types'
import { MEDIA_IMAGE_ACCEPT, MEDIA_IMAGE_MAX_BYTES, defaultTitleFromFileName, hasErrors, validateMediaMetadata, type MediaMetadataErrors } from '@/lib/media/media-validation'

const field = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const primary = 'rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50'

// The editor (and its crop library) is only fetched when the owner chooses to trim or crop.
const MediaImageEditor = dynamic(() => import('./MediaImageEditor'), { ssr: false, loading: () => <p role="status" className="text-sm text-[var(--text-secondary)]">Opening editor…</p> })

type Phase = 'idle' | 'checking' | 'ready' | 'editing' | 'uploading' | 'saving'

export interface MediaUploaderProps {
  defaultCategory?: ImageCategory
  /** Hide the category chooser (the caller already knows the category). */
  lockCategory?: boolean
  /** A name suggestion, e.g. the brand name typed in Trusted Brands. */
  suggestedTitle?: string
  disabled?: boolean
  onUploaded: (asset: MediaAsset) => void
  /** Called when the owner chooses an existing duplicate instead of uploading again. */
  onUseExisting?: (asset: MediaAsset) => void
}

export default function MediaUploader({ defaultCategory = 'general', lockCategory = false, suggestedTitle = '', disabled = false, onUploaded, onUseExisting }: MediaUploaderProps) {
  const inputId = useId()
  const [phase, setPhase] = useState<Phase>('idle')
  const [file, setFile] = useState<File | null>(null)
  /** The file as first picked, so an edit can always be undone. */
  const [original, setOriginal] = useState<File | null>(null)
  const [prepared, setPrepared] = useState<PreparedImage | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [duplicates, setDuplicates] = useState<MediaAsset[]>([])
  const [category, setCategory] = useState<ImageCategory>(defaultCategory)
  const [title, setTitle] = useState('')
  const [altText, setAltText] = useState('')
  const [decorative, setDecorative] = useState(false)
  const [caption, setCaption] = useState('')
  const [errors, setErrors] = useState<MediaMetadataErrors>({})
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const busy = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function reset() {
    setPhase('idle'); setFile(null); setOriginal(null); setPrepared(null); setDuplicates([]); setTitle(''); setAltText(''); setDecorative(false)
    setCaption(''); setErrors({}); setPreviewUrl('')
    if (inputRef.current) inputRef.current.value = ''
  }

  /**
   * Validate a picked OR edited file (size, declared type vs magic bytes, SVG/markup rejection, decodable dimensions,
   * SHA-256) with the same code path, then show it. An edited file therefore never skips security validation, and its
   * checksum is recalculated for duplicate detection.
   */
  async function load(next: File, source: 'picked' | 'edited' | 'restored') {
    if (busy.current || disabled) return
    busy.current = true
    setMessage(''); setErrors({}); setDuplicates([])
    if (source === 'picked') { setPrepared(null); setPhase('checking') } else setRevalidating(true)
    try {
      const result = await prepareImageFile(next)
      let matches: MediaAsset[] = []
      try { matches = await findAssetsByChecksum(supabase, result.checksum) } catch (error) { setMessage(`Error: ${errorText(error)}`) }
      setFile(next); setPrepared(result); setDuplicates(matches)
      if (source === 'picked') { setOriginal(next); setTitle(suggestedTitle.trim() || defaultTitleFromFileName(next.name)) }
      if (source === 'restored') setOriginal(next)
      setPreviewUrl(URL.createObjectURL(next))
      if (source === 'edited') setMessage('Edited image ready. Review the details and upload when you are happy with it.')
      setPhase('ready')
    } catch (error) {
      if (source === 'picked') { setFile(null); setPhase('idle'); if (inputRef.current) inputRef.current.value = '' }
      else setPhase(file && prepared ? 'ready' : 'idle')
      setMessage(`Error: ${errorText(error)}`)
    } finally { busy.current = false; setRevalidating(false) }
  }
  const choose = async (next: File | undefined) => { if (next) await load(next, 'picked') }

  async function upload() {
    if (!file || !prepared || busy.current || disabled) return
    const meta = { title, category, alt_text: altText, is_decorative: decorative, caption }
    const problems = validateMediaMetadata(meta)
    setErrors(problems)
    if (hasErrors(problems)) { setMessage('Error: Complete the highlighted fields.'); return }
    busy.current = true; setMessage(''); setPhase('uploading')
    try {
      const asset = await uploadImageAsset(supabase, {
        file, mime: prepared.mime, width: prepared.width, height: prepared.height, checksum: prepared.checksum,
        category, meta, token: crypto.randomUUID(),
      })
      setPhase('saving')
      reset(); setMessage('Uploaded and added to the Media Library.')
      onUploaded(asset)
    } catch (error) { setPhase('ready'); setMessage(`Error: ${errorText(error)}`) }
    finally { busy.current = false }
  }

  const working = revalidating || phase === 'checking' || phase === 'uploading' || phase === 'saving'
  const hasDuplicate = duplicates.length > 0
  const isError = message.startsWith('Error:')

  return <div className="space-y-4">
    {phase === 'idle' || phase === 'checking' ? <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files?.[0]) }}
      className={`rounded-xl border-2 border-dashed p-6 text-center ${dragging ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
      <input ref={inputRef} id={inputId} type="file" accept={MEDIA_IMAGE_ACCEPT} className="sr-only" disabled={disabled || working}
        onChange={(event) => void choose(event.target.files?.[0])} />
      <label htmlFor={inputId} className={`${button} inline-block cursor-pointer`}>{phase === 'checking' ? 'Checking file…' : 'Choose an image'}</label>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">or drag and drop it here</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">PNG, JPEG, WebP or AVIF, up to {MEDIA_IMAGE_MAX_BYTES / 1048576} MB. SVG is not accepted.</p>
    </div> : null}

    {message && <p role={isError ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${isError ? 'border-red-500/30 text-red-500' : 'border-[var(--accent)]/30 text-[var(--accent)]'}`}>{message}</p>}

    {file && prepared && phase === 'editing' && <MediaImageEditor file={file} mime={prepared.mime} onCancel={() => setPhase('ready')} onApply={(edited) => void load(edited, 'edited')} />}

    {file && prepared && phase !== 'idle' && phase !== 'checking' && phase !== 'editing' && <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
      <div>
        <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-[#e9edf2] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && <img src={previewUrl} alt="Preview of the selected file" className="max-h-full max-w-full object-contain" />}
        </div>
        <dl className="mt-2 space-y-0.5 text-xs text-[var(--text-muted)]">
          <div><dt className="inline font-semibold">File: </dt><dd className="inline break-all">{file.name}</dd></div>
          <div><dt className="inline font-semibold">Size: </dt><dd className="inline">{formatBytes(prepared.size)}</dd></div>
          <div><dt className="inline font-semibold">Dimensions: </dt><dd className="inline">{prepared.width} × {prepared.height}px</dd></div>
          <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{prepared.mime}</dd></div>
        </dl>
      </div>

      <fieldset disabled={working || disabled} className="min-w-0 space-y-3">
        {hasDuplicate && <div role="alert" className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold text-[var(--text-primary)]">This file already exists in the Media Library.</p>
          <ul className="space-y-1">{duplicates.map((asset) => <li key={asset.id} className="flex flex-wrap items-center gap-2">
            <span>{asset.title}{asset.status === 'archived' ? ' (archived)' : ''}</span>
            {onUseExisting && asset.status === 'active' && <button type="button" className={button} onClick={() => { reset(); onUseExisting(asset) }}>Use existing asset</button>}
          </li>)}</ul>
          <p className="text-xs text-[var(--text-muted)]">You can still upload it again if it is meant to be a separate asset.</p>
        </div>}

        <label className="block text-sm">Name *<input className={field} value={title} maxLength={160} aria-invalid={!!errors.title} onChange={(event) => setTitle(event.target.value)} />
          {errors.title && <span role="alert" className="mt-1 block text-xs text-red-500">{errors.title}</span>}</label>
        {!lockCategory && <label className="block text-sm">Category *<select className={field} value={category} onChange={(event) => { if (isImageCategory(event.target.value)) setCategory(event.target.value) }}>
          {IMAGE_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>}
        <label className="block text-sm">Alt text{decorative ? '' : ' *'}<input className={field} value={decorative ? '' : altText} disabled={decorative} maxLength={300} aria-invalid={!!errors.alt_text}
          placeholder={decorative ? 'Not needed for a decorative image' : 'Describe what the image shows'} onChange={(event) => setAltText(event.target.value)} />
          {errors.alt_text && <span role="alert" className="mt-1 block text-xs text-red-500">{errors.alt_text}</span>}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={decorative} onChange={(event) => setDecorative(event.target.checked)} />Decorative: this image adds no information, so screen readers skip it</label>
        <label className="block text-sm">Caption (optional)<input className={field} value={caption} maxLength={1000} onChange={(event) => setCaption(event.target.value)} /></label>

        <div className="flex flex-wrap items-center gap-3">
          {(!hasDuplicate || phase === 'uploading') ? <button type="button" className={primary} onClick={() => void upload()}>{phase === 'uploading' ? 'Uploading…' : 'Upload to Media Library'}</button>
            : <button type="button" className={primary} onClick={() => void upload()}>Upload anyway</button>}
          <button type="button" className={button} disabled={working || disabled} onClick={() => setPhase('editing')}>Trim or crop</button>
          {original && file !== original && <button type="button" className={button} disabled={working || disabled} onClick={() => void load(original, 'restored')}>Use original</button>}
          <button type="button" className={button} onClick={reset}>Cancel</button>
          {working && <progress aria-label="Uploading" className="h-2 w-32" />}
        </div>
      </fieldset>
    </div>}
  </div>
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Something went wrong. Please try again.'
}
