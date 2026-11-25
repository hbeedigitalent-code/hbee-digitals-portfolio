'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  CUSTOM_LABEL_MAX, DISPLAY_TYPES, addPlacements, displayTypesFor, isDisplayType, listPlacements, movePlacement, placementBlocker, removePlacement,
  updatePlacement, type PlacementEdit, type PlacementTarget, type PlacementWithAsset,
} from '@/lib/media/placements'
import { CATEGORY_LABELS, type MediaAsset } from '@/lib/media/media-types'
import MediaPicker from './MediaPicker'

const field = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'
const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const primary = 'rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50'

const editOf = (row: PlacementWithAsset): PlacementEdit => ({
  display_type: row.display_type, custom_label: row.custom_label, title_override: row.title_override,
  caption_override: row.caption_override, related_project_id: row.related_project_id, is_active: row.is_active,
})

interface ProjectOption { id: string; name: string }

export interface PlacementManagerProps {
  target: PlacementTarget
  heading: string
  /** Where this collection appears on the website. */
  description: string
}

/**
 * Manage one showcase: add existing Media Library assets, label them, order them, switch them on or off, remove them.
 * Changes here save immediately and independently of any surrounding editor. Nothing is uploaded or deleted from the
 * library here.
 */
export default function PlacementManager({ target, heading, description }: PlacementManagerProps) {
  const [rows, setRows] = useState<PlacementWithAsset[]>([])
  const [drafts, setDrafts] = useState<Record<string, PlacementEdit>>({})
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState('')
  const { type, key, slot } = target

  const load = useCallback(async () => {
    try { setRows(await listPlacements(supabase, { type, key, slot })); setError('') }
    catch (cause) { setError(errorText(cause)) }
    finally { setLoading(false) }
  }, [type, key, slot])
  useEffect(() => { setLoading(true); setDrafts({}); void load() }, [load])

  useEffect(() => {
    if (type === 'project') return
    let live = true
    void supabase.from('portfolio_items').select('*').limit(500).then(({ data }) => {
      if (!live || !data) return
      setProjects((data as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        name: `${String(row.client_name || row.name || row.title || row.slug || 'Project')}${row.is_active === false ? ' (not public)' : ''}`,
      })).sort((a, b) => a.name.localeCompare(b.name)))
    })
    return () => { live = false }
  }, [type])

  async function act(action: () => Promise<string>) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { setMessage(await action()) } catch (cause) { setError(errorText(cause)) }
    finally { await load(); setBusy(false) }
  }

  const add = (assets: MediaAsset[]) => act(async () => {
    const result = await addPlacements(supabase, target, assets, rows)
    const added = result.added ? `Added ${result.added} item${result.added === 1 ? '' : 's'}, hidden for now. Check each label, then choose “Show on website”.` : 'Nothing was added.'
    return [added, ...result.skipped].join(' ')
  })
  const save = (row: PlacementWithAsset, edit: PlacementEdit, done: string) => act(async () => {
    await updatePlacement(supabase, row, edit)
    setDrafts((previous) => { const next = { ...previous }; delete next[row.id]; return next })
    return done
  })
  const move = (index: number, direction: -1 | 1) => act(async () => { await movePlacement(supabase, rows, index, direction); return 'Order saved.' })
  const remove = (row: PlacementWithAsset) => act(async () => { await removePlacement(supabase, row.id); setConfirming(''); return 'Removed from this showcase. The asset stays in the Media Library.' })

  const placed = new Set(rows.map((row) => row.media_asset_id))
  const shown = rows.filter((row) => row.is_active).length

  return <section aria-label={heading} className="space-y-4"
    // This panel can sit inside a project form: Enter in one of its fields must not submit that form.
    onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-[var(--text-primary)]">{heading}</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{description} {rows.length ? `${shown} of ${rows.length} shown on the website.` : ''}</p>
      </div>
      <button type="button" className={primary} disabled={busy || loading} onClick={() => setPicking(true)}>Add from Media Library</button>
    </div>
    {message && <p role="status" className="rounded-lg border border-[var(--accent)]/30 p-3 text-sm text-[var(--accent)]">{message}</p>}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-red-500/30 p-3 text-sm text-red-500"><p>{error}</p><button type="button" className={button} onClick={() => void load()}>Retry</button></div>}
    {loading && <p role="status" className="text-sm text-[var(--text-muted)]">Loading…</p>}
    {!loading && !error && !rows.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">Nothing here yet, so this section does not appear on the website.</p>}

    <ol className="space-y-3">
      {rows.map((row, index) => {
        const asset = row.asset
        const edit = drafts[row.id] ?? editOf(row)
        const dirty = !!drafts[row.id]
        const change = (patch: Partial<PlacementEdit>) => setDrafts((previous) => ({ ...previous, [row.id]: { ...edit, ...patch } }))
        const name = asset?.title ?? 'Missing asset'
        return <li key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e9edf2] p-1">
              {!asset ? <span className="text-xs text-gray-600">Missing</span> : asset.kind === 'video' ? <span className="text-xs font-semibold text-gray-600">▶ Video</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={asset.public_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />}
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
              <p className="text-xs text-[var(--text-muted)]">{asset ? CATEGORY_LABELS[asset.category] : ''}</p>
              <p className={`text-sm font-bold ${row.is_active ? 'text-[var(--accent)]' : 'text-amber-500'}`}>{row.is_active ? 'Shown on website' : 'Hidden'}</p>
              {asset?.status === 'archived' && <p className="text-xs text-amber-500">Archived in the library. It stays {row.is_active ? 'visible here' : 'placed here'} until you hide or remove it.</p>}
              {asset?.kind === 'video' && !asset.poster_asset_id && <p className="text-xs text-[var(--text-muted)]">No poster: add one on the Media Library page so the card has a preview.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} disabled={busy || index === 0} aria-label={`Move ${name} up`} onClick={() => void move(index, -1)}>Move up</button>
              <button type="button" className={button} disabled={busy || index === rows.length - 1} aria-label={`Move ${name} down`} onClick={() => void move(index, 1)}>Move down</button>
              <button type="button" className={button} disabled={busy || !asset} onClick={() => void save(row, { ...edit, is_active: !row.is_active }, row.is_active ? 'Hidden from the website.' : 'Now shown on the website (public pages refresh within a few minutes).')}>
                {row.is_active ? 'Hide' : 'Show on website'}</button>
            </div>
          </div>

          <fieldset disabled={busy || !asset} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Display label<select className={field} value={edit.display_type} onChange={(event) => { if (isDisplayType(event.target.value)) change({ display_type: event.target.value }) }}>
              {displayTypesFor(asset?.kind ?? 'image').map((value) => <option key={value} value={value}>{DISPLAY_TYPES[value].label}</option>)}</select></label>
            {edit.display_type === 'other' && <label className="block text-sm">Custom label *<input className={field} value={edit.custom_label} maxLength={CUSTOM_LABEL_MAX} onChange={(event) => change({ custom_label: event.target.value })} /></label>}
            <label className="block text-sm">Title (optional)<input className={field} value={edit.title_override} maxLength={160} placeholder="Shown on the website" onChange={(event) => change({ title_override: event.target.value })} /></label>
            {type !== 'project' && <label className="block text-sm">Related project (optional)<select className={field} value={edit.related_project_id ?? ''} onChange={(event) => change({ related_project_id: event.target.value || null })}>
              <option value="">None</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
            <label className="block text-sm sm:col-span-2">Caption (optional)<input className={field} value={edit.caption_override} maxLength={600} onChange={(event) => change({ caption_override: event.target.value })} /></label>
          </fieldset>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={button} disabled={busy || !dirty} onClick={() => void save(row, edit, 'Saved.')}>Save changes</button>
            {confirming === row.id
              ? <><span className="text-sm text-[var(--text-secondary)]">Remove from this showcase? The asset and its file are kept.</span>
                <button type="button" className={button} disabled={busy} onClick={() => void remove(row)}>Confirm remove</button>
                <button type="button" className={button} onClick={() => setConfirming('')}>Keep</button></>
              : <button type="button" className={button} disabled={busy} onClick={() => setConfirming(row.id)}>Remove…</button>}
            <Link href="/admin/media" className="text-xs text-[var(--accent)] underline">Open Media Library</Link>
          </div>
        </li>
      })}
    </ol>

    <MediaPicker open={picking} kind="all" multiple allowUpload={false} heading={`Add to ${heading}`} onClose={() => setPicking(false)} onSelect={() => {}} onSelectMany={(assets) => void add(assets)}
      unavailable={(asset) => (placed.has(asset.id) ? 'Already added' : placementBlocker(asset))} />
  </section>
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Something went wrong. Please try again.'
}
