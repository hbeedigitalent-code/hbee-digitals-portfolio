'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { archiveAsset, listMediaAssets, restoreAsset, scanAssetUsage, updateAssetMetadata, type MediaUsageScan } from '@/lib/media/media-library'
import { CATEGORY_LABELS, IMAGE_CATEGORIES, MEDIA_CATEGORIES, formatBytes, isImageCategory, isMediaCategory, isMediaKind, type MediaAsset, type MediaCategory, type MediaKind, type MediaStatus } from '@/lib/media/media-types'
import MediaUploader from '@/components/admin/media/MediaUploader'

const field = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MediaCategory | ''>('')
  const [kind, setKind] = useState<MediaKind | ''>('')
  const [status, setStatus] = useState<MediaStatus>('active')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer) }, [search])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setAssets(await listMediaAssets(supabase, { search: query, category, kind, status, limit: 200 })) }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load the Media Library.') }
    finally { setLoading(false) }
  }, [query, category, kind, status])
  useEffect(() => { void load() }, [load])

  const selected = assets.find((asset) => asset.id === selectedId) ?? null

  function replaceAsset(next: MediaAsset) { setAssets((previous) => previous.map((asset) => (asset.id === next.id ? next : asset))) }
  function removeFromView(id: string) { setAssets((previous) => previous.filter((asset) => asset.id !== id)); setSelectedId(null) }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Media Library</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Upload graphics and brand logos once, then reuse them. Archiving hides an asset from pickers but never deletes the file or breaks pages that already use it.</p>
      </div>
      <button type="button" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)]" onClick={() => setShowUpload((value) => !value)} aria-expanded={showUpload}>{showUpload ? 'Close upload' : 'Upload image'}</button>
    </div>

    {notice && <p role="status" className="rounded-lg border border-[var(--accent)]/30 p-3 text-sm text-[var(--accent)]">{notice}</p>}

    {showUpload && <section aria-label="Upload an image" className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <MediaUploader onUploaded={(asset) => { setNotice(`“${asset.title}” was added to the Media Library.`); setStatus('active'); setCategory(''); setKind(''); setSearch(''); setQuery(''); setSelectedId(asset.id); void load() }}
        onUseExisting={(asset) => { setNotice(`Using the existing asset “${asset.title}”.`); setSelectedId(asset.id) }} />
    </section>}

    <section aria-label="Filters" className="flex flex-wrap items-end gap-3">
      <label className="min-w-[12rem] flex-1 text-sm">Search by name<input type="search" className={`${field} mt-1`} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="text-sm">Category<select className={`${field} mt-1`} value={category} onChange={(event) => setCategory(isMediaCategory(event.target.value) ? event.target.value : '')}>
        <option value="">All categories</option>{MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label>
      <label className="text-sm">Type<select className={`${field} mt-1`} value={kind} onChange={(event) => setKind(isMediaKind(event.target.value) ? event.target.value : '')}>
        <option value="">All types</option><option value="image">Images</option><option value="video">Videos</option></select></label>
      <label className="text-sm">Status<select className={`${field} mt-1`} value={status} onChange={(event) => setStatus(event.target.value === 'archived' ? 'archived' : 'active')}>
        <option value="active">Active</option><option value="archived">Archived</option></select></label>
      <div role="group" aria-label="Layout" className="flex gap-1">
        {(['grid', 'list'] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} className={`${button} ${view === value ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`} onClick={() => setView(value)}>{value === 'grid' ? 'Grid' : 'List'}</button>)}
      </div>
    </section>

    {error && <div role="alert" className="space-y-2 rounded-lg border border-red-500/30 p-4 text-sm text-red-500"><p>{error}</p><button type="button" className={button} onClick={() => void load()}>Retry</button></div>}
    {loading && <p role="status" className="text-sm text-[var(--text-muted)]">Loading…</p>}
    {!loading && !error && !assets.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">{query || category || kind ? 'No assets match these filters.' : status === 'archived' ? 'No archived assets.' : 'No assets yet. Use “Upload image” to add your first logo or graphic.'}</p>}

    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {view === 'grid'
        ? <ul className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => <li key={asset.id}>
          <button type="button" aria-pressed={asset.id === selectedId} onClick={() => setSelectedId(asset.id)} className={`flex w-full flex-col gap-2 rounded-xl border bg-[var(--bg-card)] p-2 text-left ${asset.id === selectedId ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border)]'}`}>
            <span className="flex h-28 items-center justify-center rounded-lg bg-white p-1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.public_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{asset.title}</span>
              <span className="block truncate text-xs text-[var(--text-muted)]">{CATEGORY_LABELS[asset.category]}</span></span>
          </button></li>)}</ul>
        : <ul className="space-y-2">{assets.map((asset) => <li key={asset.id}>
          <button type="button" aria-pressed={asset.id === selectedId} onClick={() => setSelectedId(asset.id)} className={`flex w-full items-center gap-3 rounded-xl border bg-[var(--bg-card)] p-2 text-left ${asset.id === selectedId ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
            <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-white p-1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.public_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{asset.title}</span>
              <span className="block truncate text-xs text-[var(--text-muted)]">{CATEGORY_LABELS[asset.category]} · {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}{formatBytes(asset.size_bytes)}</span></span>
          </button></li>)}</ul>}

      <aside aria-label="Asset details" className="lg:sticky lg:top-4 lg:self-start">
        {selected ? <AssetDetail key={selected.id} asset={selected}
          onChanged={replaceAsset} onStatusChanged={(next, message) => { setNotice(message); if (next.status !== status) removeFromView(next.id); else replaceAsset(next) }} />
          : <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">Select an asset to preview it, edit its details, copy its URL or archive it.</p>}
      </aside>
    </div>
  </div>
}

function AssetDetail({ asset, onChanged, onStatusChanged }: { asset: MediaAsset; onChanged: (asset: MediaAsset) => void; onStatusChanged: (asset: MediaAsset, message: string) => void }) {
  const [title, setTitle] = useState(asset.title)
  const [altText, setAltText] = useState(asset.alt_text)
  const [decorative, setDecorative] = useState(asset.is_decorative)
  const [caption, setCaption] = useState(asset.caption)
  const [category, setCategory] = useState<MediaCategory>(asset.category)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState<MediaUsageScan | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const dirty = title !== asset.title || altText !== asset.alt_text || decorative !== asset.is_decorative || caption !== asset.caption || category !== asset.category
  const isImage = asset.kind === 'image'
  const archived = asset.status === 'archived'

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(`Error: ${error instanceof Error ? error.message : 'Something went wrong.'}`) } finally { setBusy(false) }
  }

  const save = () => run(async () => {
    const next = await updateAssetMetadata(supabase, asset, { title, alt_text: altText, is_decorative: decorative, caption, ...(isImageCategory(category) ? { category } : {}) })
    onChanged(next); setMessage('Details saved.')
  })
  const check = () => run(async () => { setScan(await scanAssetUsage(supabase, asset)) })
  const startArchive = () => run(async () => { setScan(await scanAssetUsage(supabase, asset)); setConfirmArchive(true) })
  const doArchive = () => run(async () => { const next = await archiveAsset(supabase, asset.id); onStatusChanged(next, `“${next.title}” was archived. The file and any pages using it are unchanged.`) })
  const doRestore = () => run(async () => { const next = await restoreAsset(supabase, asset.id); onStatusChanged(next, `“${next.title}” was restored.`) })
  const copy = () => run(async () => {
    try { await navigator.clipboard.writeText(asset.public_url); setMessage('URL copied.') }
    catch { setMessage('Could not copy automatically. Select the URL below and copy it.') }
  })

  return <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
    <div className="flex h-48 items-center justify-center rounded-lg bg-white p-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.public_url} alt={asset.is_decorative ? '' : asset.alt_text || asset.title} className="max-h-full max-w-full object-contain" /></div>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
      <dt>Dimensions</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : '—'}</dd>
      <dt>Size</dt><dd>{formatBytes(asset.size_bytes)}</dd>
      <dt>Type</dt><dd>{asset.mime_type}</dd>
      <dt>Storage</dt><dd className="break-all">{asset.bucket}</dd>
      <dt>Status</dt><dd>{archived ? 'Archived' : 'Active'}</dd>
    </dl>
    <label className="block text-xs text-[var(--text-muted)]">URL<input readOnly value={asset.public_url} onFocus={(event) => event.currentTarget.select()} className={`${field} mt-1 text-xs`} /></label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy} onClick={() => void copy()}>Copy URL</button>
      <button type="button" className={button} disabled={busy} onClick={() => void check()}>Where is it used?</button>
    </div>

    <fieldset disabled={busy || !isImage} className="space-y-3 border-t border-[var(--border)] pt-3">
      <label className="block text-sm">Name<input className={`${field} mt-1`} value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block text-sm">Category<select className={`${field} mt-1`} value={category} onChange={(event) => { if (isMediaCategory(event.target.value)) setCategory(event.target.value) }}>
        {IMAGE_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
        {!isImageCategory(asset.category) && <option value={asset.category}>{CATEGORY_LABELS[asset.category]}</option>}</select></label>
      <label className="block text-sm">Alt text{decorative ? '' : ' *'}<input className={`${field} mt-1`} value={decorative ? '' : altText} disabled={decorative} maxLength={300} onChange={(event) => setAltText(event.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={decorative} onChange={(event) => setDecorative(event.target.checked)} />Decorative image</label>
      <label className="block text-sm">Caption<input className={`${field} mt-1`} value={caption} maxLength={1000} onChange={(event) => setCaption(event.target.value)} /></label>
      <button type="button" className={button} disabled={!dirty || busy} onClick={() => void save()}>Save details</button>
    </fieldset>

    {message && <p role={message.startsWith('Error:') ? 'alert' : 'status'} className={`text-sm ${message.startsWith('Error:') ? 'text-red-500' : 'text-[var(--accent)]'}`}>{message}</p>}

    {scan && <div className="space-y-2 rounded-lg border border-[var(--border)] p-3 text-sm" aria-live="polite">
      <p className="font-semibold text-[var(--text-primary)]">{scan.usages.length ? `Used in ${scan.usages.length} place${scan.usages.length === 1 ? '' : 's'}` : 'Not found in the places checked'}</p>
      {scan.usages.length > 0 && <ul className="space-y-1">{scan.usages.map((usage, index) => <li key={`${usage.href}-${usage.field}-${index}`}>
        <Link href={usage.href} className="text-[var(--accent)] underline">{usage.area}: {usage.label}</Link> <span className="text-xs text-[var(--text-muted)]">({usage.field}{usage.detail ? `; ${usage.detail}` : ''})</span></li>)}</ul>}
      {scan.unscanned.length > 0 && <p className="text-xs text-[var(--text-muted)]">Could not check: {scan.unscanned.map((entry) => entry.area).join(', ')}.</p>}
      <p className="text-xs text-[var(--text-muted)]">Image links written inside article text or other free-form content may not be detected.</p>
    </div>}

    <div className="border-t border-[var(--border)] pt-3">
      {archived ? <button type="button" className={button} disabled={busy} onClick={() => void doRestore()}>Restore asset</button>
        : confirmArchive ? <div className="space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">Archiving hides this asset from pickers. The file stays in storage and existing pages keep working{scan?.usages.length ? ', including the places listed above' : ''}.</p>
          <div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => void doArchive()}>Confirm archive</button><button type="button" className={button} onClick={() => setConfirmArchive(false)}>Cancel</button></div></div>
          : <button type="button" className={button} disabled={busy} onClick={() => void startArchive()}>Archive…</button>}
    </div>
  </div>
}
