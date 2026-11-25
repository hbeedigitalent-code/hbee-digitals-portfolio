'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { listMediaAssets } from '@/lib/media/media-library'
import { CATEGORY_LABELS, IMAGE_CATEGORIES, VIDEO_CATEGORIES, formatBytes, isImageCategory, isVideoCategory, type ImageCategory, type MediaAsset, type MediaKind, type VideoCategory } from '@/lib/media/media-types'
import MediaUploader from './MediaUploader'

const field = 'rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export interface MediaPickerProps {
  open: boolean
  /** What is being chosen. Default 'image'. Videos are selected here and uploaded on the Media Library page. */
  kind?: MediaKind | 'all'
  /** Choose several assets, then "Add selected". Single-value fields leave this off. */
  multiple?: boolean
  /** Receives the chosen assets, in the order they were ticked (multiple mode). */
  onSelectMany?: (assets: MediaAsset[]) => void
  /** Why an asset cannot be chosen here (shown on its tile), or undefined if it can. */
  unavailable?: (asset: MediaAsset) => string | undefined
  /** Hide the Upload tab where uploading belongs to the Media Library page. */
  allowUpload?: boolean
  onClose: () => void
  /** Receives the full asset: metadata (alt text, dimensions, category…) plus public_url. */
  onSelect: (asset: MediaAsset) => void
  selectedId?: string | null
  /** Highlights the matching asset when the current value is a legacy raw URL. */
  selectedUrl?: string | null
  /** Category the library opens filtered to (the owner can change it). */
  initialCategory?: ImageCategory | ''
  /** Category preselected on the Upload tab. */
  uploadCategory?: ImageCategory
  suggestedTitle?: string
  heading?: string
  /** Stay open after each choice (e.g. adding several gallery images). The Close button becomes Done. */
  keepOpen?: boolean
}

export default function MediaPicker({ kind = 'image', multiple = false, onSelectMany, unavailable, allowUpload = true, open, onClose, onSelect, selectedId = null, selectedUrl = null, initialCategory = '', uploadCategory = 'general', suggestedTitle = '', heading = 'Choose from the Media Library', keepOpen = false }: MediaPickerProps) {
  const headingId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ImageCategory | VideoCategory | ''>(initialCategory)
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')
  const [chosen, setChosen] = useState<MediaAsset[]>([])

  // Remember who opened the dialog; give focus back when it closes.
  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setTab('library'); setCategory(initialCategory); setSearch(''); setQuery(''); setAdded(''); setChosen([])
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => { window.clearTimeout(timer); returnFocus.current?.focus?.() }
  }, [open, initialCategory])

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search), 250); return () => window.clearTimeout(timer) }, [search])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setAssets(await listMediaAssets(supabase, { search: query, category, kind: kind === 'all' ? '' : kind, status: 'active', limit: 120 })) }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load the Media Library.') }
    finally { setLoading(false) }
  }, [query, category, kind])
  useEffect(() => { if (open && tab === 'library') void load() }, [open, tab, load])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.offsetParent !== null || element === document.activeElement)
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const toggle = (asset: MediaAsset) => setChosen((previous) => (previous.some((item) => item.id === asset.id) ? previous.filter((item) => item.id !== asset.id) : [...previous, asset]))
  function addChosen() {
    if (!chosen.length) return
    if (onSelectMany) onSelectMany(chosen)
    else chosen.forEach(onSelect)
    setChosen([]); onClose()
  }
  const categories = kind === 'video' ? VIDEO_CATEGORIES : kind === 'all' ? [...IMAGE_CATEGORIES, ...VIDEO_CATEGORIES.filter((value) => value !== 'bgc_video')] : IMAGE_CATEGORIES

  function choose(asset: MediaAsset) {
    // A file uploaded from inside a multi-select picker joins the selection.
    if (multiple) { setChosen((previous) => (previous.some((item) => item.id === asset.id) ? previous : [...previous, asset])); setTab('library'); return }
    onSelect(asset)
    if (keepOpen) { setAdded(`Added “${asset.title}”. Choose another, or press Done.`); setTab('library') } else onClose()
  }

  if (!open) return null
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={onKeyDown}
      className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <h2 id={headingId} className="text-lg font-black text-[var(--text-primary)]">{heading}</h2>
        <button type="button" className={button} onClick={onClose}>{keepOpen ? 'Done' : 'Close'}</button>
      </div>
      {allowUpload && <div role="tablist" aria-label="Media source" className="flex gap-2 border-b border-[var(--border)] px-5 py-2">
        {(['library', 'upload'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value}
          className={`${button} ${tab === value ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`} onClick={() => setTab(value)}>{value === 'library' ? 'Library' : 'Upload new'}</button>)}
      </div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === 'library' ? <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex-1 text-sm"><span className="sr-only">Search by name</span>
              <input ref={searchRef} type="search" className={`${field} w-full`} placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label className="text-sm"><span className="sr-only">Filter by category</span>
              <select className={field} value={category} onChange={(event) => setCategory(isImageCategory(event.target.value) || isVideoCategory(event.target.value) ? event.target.value : '')}>
                <option value="">All categories</option>
                {categories.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
          </div>
          {added && <p role="status" className="text-sm text-[var(--accent)]">{added}</p>}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          {loading && <p role="status" className="text-sm text-[var(--text-muted)]">Loading…</p>}
          {!loading && !error && !assets.length && <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">Nothing found. Try another search{allowUpload ? ', or use “Upload new”' : ', or upload on the Media Library page'}.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => {
              const current = asset.id === selectedId || (!!selectedUrl && asset.public_url === selectedUrl)
              const ticked = chosen.some((item) => item.id === asset.id)
              const blocked = unavailable?.(asset)
              return <li key={asset.id}>
                <button type="button" aria-pressed={multiple ? ticked : current} disabled={!!blocked} onClick={() => (multiple ? toggle(asset) : choose(asset))}
                  className={`flex w-full flex-col gap-2 rounded-xl border p-2 text-left disabled:opacity-50 ${current || ticked ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
                  <span className="flex h-24 items-center justify-center rounded-lg bg-white p-1">
                    {asset.kind === 'video' ? <span className="text-xs font-semibold text-gray-600">▶ Video{asset.duration_seconds ? ` · ${Math.round(asset.duration_seconds)} s` : ''}</span>
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={asset.public_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{asset.title}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">{CATEGORY_LABELS[asset.category]}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''} · {formatBytes(asset.size_bytes)}</span>
                    {current && <span className="text-xs font-bold text-[var(--accent)]">Current selection</span>}
                    {ticked && <span className="text-xs font-bold text-[var(--accent)]">✓ Selected</span>}
                    {blocked && <span className="block text-xs text-[var(--text-muted)]">{blocked}</span>}
                  </span>
                </button>
              </li>
            })}
          </ul>
        </div> : kind === 'video' ? <p className="text-sm text-[var(--text-secondary)]">Upload videos, and choose their posters, on the <a href="/admin/media" target="_blank" rel="noopener" className="text-[var(--accent)] underline">Media Library page</a>. Then reopen this picker and choose the video from the Library tab.</p>
          : <MediaUploader defaultCategory={uploadCategory} suggestedTitle={suggestedTitle} onUploaded={choose} onUseExisting={choose} />}
      </div>
      {multiple && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
        <p role="status" className="text-sm text-[var(--text-secondary)]">{chosen.length} selected</p>
        <div className="flex gap-2">
          <button type="button" className={button} disabled={!chosen.length} onClick={() => setChosen([])}>Clear selection</button>
          <button type="button" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50" disabled={!chosen.length} onClick={addChosen}>Add selected</button>
        </div>
      </div>}
    </div>
  </div>
}
