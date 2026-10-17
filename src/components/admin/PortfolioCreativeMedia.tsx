'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import { portfolioErrorMessage, validPortfolioImage } from '@/lib/admin/portfolio-editor'
import { ASSET_TYPES, CAPABILITY_SLUGS, creativeRevision, creativeSavePayload, isCapabilitySlug, readCreativeMedia, reorderMedia, validateCreativeMedia, type PortfolioMedia } from '@/lib/portfolio-creative'
import { SERVICE_GROUPS } from '@/components/site/services/services-content'

const input = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-sm text-[var(--text-primary)]'
const action = 'rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-40'

/** Mounted only with the rollout flag; saves independently from Phase B fields. */
export default function PortfolioCreativeMedia({ portfolioId, disabled }: { portfolioId: string; disabled: boolean }) {
  const [media, setMedia] = useState<PortfolioMedia[]>([])
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadKey, setUploadKey] = useState(0)
  const [revision, setRevision] = useState('')
  const [clearMedia, setClearMedia] = useState(false)
  const [clearCapabilities, setClearCapabilities] = useState(false)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [conflict, setConflict] = useState(false)
  const pendingUploadsRef = useRef(0)
  const mutationVersion = useRef(0)
  const savePending = useRef(false)
  const latestMedia = useRef(media)
  latestMedia.current = media

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setError('')
    setMessage('')
    setRevision('')
    setClearMedia(false)
    setClearCapabilities(false)
    setConflict(false)
    async function load() {
      try {
        // Bracket the two child reads with revision reads. Child-write triggers
        // invalidate this snapshot if another writer commits during loading.
        const before = await supabase.from('portfolio_items').select('creative_revision::text').eq('id', portfolioId).single()
        if (before.error) throw before.error
        const startRevision = creativeRevision(before.data?.creative_revision)
        const [assets, assignments] = await Promise.all([
          supabase.from('portfolio_media').select('*').eq('portfolio_id', portfolioId).order('display_order'),
          supabase.from('portfolio_capabilities').select('capability_slug').eq('portfolio_id', portfolioId),
        ])
        if (assets.error || assignments.error) throw assets.error || assignments.error
        const next = readCreativeMedia(assets.data || [])
        const slugs = (assignments.data || []).map((row) => row.capability_slug)
        if (!slugs.every(isCapabilitySlug)) throw new Error('Unrecognised capability assignment. Nothing has been overwritten.')
        const after = await supabase.from('portfolio_items').select('creative_revision::text').eq('id', portfolioId).single()
        if (after.error) throw after.error
        if (creativeRevision(after.data?.creative_revision) !== startRevision) throw new Error('Creative metadata changed while loading. Reload to get a consistent snapshot.')
        if (!cancelled) { latestMedia.current = next; setMedia(next); setCapabilities(slugs); setRevision(startRevision); setLoaded(true); setDirty(false) }
      } catch (error) { if (!cancelled) setError(portfolioErrorMessage(error, 'Unable to load creative media. Check the approved schema rollout.')) }
    }
    void load()
    return () => { cancelled = true }
  }, [portfolioId])

  const uploadingChanged = useCallback((uploading: boolean) => {
    pendingUploadsRef.current = Math.max(0, pendingUploadsRef.current + (uploading ? 1 : -1))
    setPendingUploads(pendingUploadsRef.current)
  }, [])
  function markDirty() { mutationVersion.current++; setDirty(true); setMessage('') }
  function change(next: PortfolioMedia[]) { latestMedia.current = next; setMedia(next); if (next.length) setClearMedia(false); markDirty() }
  function removeAllMedia() { change([]); setClearMedia(true) }
  function changeCapabilities(next: string[], explicitlyCleared = false) { setCapabilities(next); setClearCapabilities(explicitlyCleared); markDirty() }
  function update(index: number, patch: Partial<PortfolioMedia>) { change(media.map((item, i) => i === index ? { ...item, ...patch } : item)) }
  function add(url = '') {
    change([...latestMedia.current, { id: crypto.randomUUID(), asset_type: 'other', image_url: url, alt_text: '', caption: '', is_visible: false, fit_mode: 'auto', display_order: latestMedia.current.length, width: null, height: null }])
  }
  async function save() {
    if (savePending.current || disabled || !loaded || conflict || pendingUploadsRef.current) return
    const ordered = media.map((item, display_order) => ({ ...item, display_order }))
    const validation = validateCreativeMedia(ordered, capabilities)
    if (validation) { setError(validation); return }
    const versionAtStart = mutationVersion.current
    savePending.current = true
    setSaving(true); setError(''); setMessage('')
    try {
      const { data, error } = await supabase.rpc('save_portfolio_creative', creativeSavePayload(portfolioId, ordered, capabilities, revision, clearMedia, clearCapabilities))
      if (error) throw error
      setRevision(creativeRevision(data))
      if (mutationVersion.current === versionAtStart) {
        latestMedia.current = ordered; setMedia(ordered); setDirty(false); setClearMedia(false); setClearCapabilities(false)
        setMessage('Creative media and capability assignments saved. Public pages may take time to refresh.')
      } else { setDirty(true); setMessage('Snapshot saved. Newer local changes remain unsaved; save again after uploads finish.') }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '40001') {
        setConflict(true)
        setError('Creative metadata changed on the server. Your edits remain here. Reload and review the latest version before reapplying them; no changes from this save were written.')
      } else { setError(portfolioErrorMessage(error, 'Creative media was not saved. Your edits remain here.')) }
    }
    finally { savePending.current = false; setSaving(false) }
  }

  if (!loaded) return <p role={error ? 'alert' : 'status'} className="text-sm text-[var(--text-muted)]">{error || 'Loading creative media…'}</p>
  return (
    <fieldset disabled={disabled || saving} className="min-w-0 space-y-5">
      <p className="text-sm text-[var(--text-muted)]">These assets belong to this engagement. They do not become separate /work cards. Save this section separately from the project details. Hidden assets are excluded from public reads; uploaded files in the public bucket are still public by URL.</p>
      <div className="space-y-3">
        <h3 className="font-bold text-[var(--text-primary)]">Explicit capabilities</h3>
        <p className="text-sm text-[var(--text-muted)]">Assign only verified Hbee work. Industry, project label, technologies and asset type remain separate.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAPABILITY_SLUGS.map((slug) => <label key={slug} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={capabilities.includes(slug)} onChange={(e) => {
            const next = e.target.checked ? [...capabilities, slug] : capabilities.filter((s) => s !== slug)
            changeCapabilities(next, !e.target.checked && next.length === 0)
          }} />{SERVICE_GROUPS.flatMap((g) => g.capabilities).find((c) => c.slug === slug)?.name}</label>)}
        </div>
        <button type="button" className={action} disabled={!capabilities.length} onClick={() => changeCapabilities([], true)}>Clear all capability assignments on save</button>
        {clearCapabilities && <p role="status" className="text-sm text-[var(--text-muted)]">All saved capability assignments will be removed when you save.</p>}
      </div>
      <ol className="space-y-5">
        {media.map((item, index) => <li key={item.id} className="space-y-4 rounded-xl border border-[var(--border)] p-4">
          <h3 className="font-bold text-[var(--text-primary)]">Asset {index + 1}</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              {validPortfolioImage(item.image_url) && <img src={item.image_url} alt={item.alt_text || 'Asset preview'} className="h-48 w-full bg-[var(--bg-section)] object-contain" />}
              <ImageUpload key={item.image_url} label={`Upload replacement for asset ${index + 1}`} folder={`portfolio/${portfolioId}`} contain disabled={saving || disabled} onUploadingChange={uploadingChanged} onUpload={(url) => change(latestMedia.current.map((m) => m.id === item.id ? { ...m, image_url: url } : m))} />
              <label className="block text-sm text-[var(--text-secondary)]">Image URL<input value={item.image_url} onChange={(e) => update(index, { image_url: e.target.value })} className={input} /></label>
            </div>
            <div className="space-y-3">
              <label className="block text-sm text-[var(--text-secondary)]">Asset type<select value={item.asset_type} onChange={(e) => update(index, { asset_type: e.target.value as PortfolioMedia['asset_type'] })} className={input}>{Object.entries(ASSET_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm text-[var(--text-secondary)]">Alt text *<input value={item.alt_text} onChange={(e) => update(index, { alt_text: e.target.value })} className={input} /></label>
              <label className="block text-sm text-[var(--text-secondary)]">Caption (optional)<textarea value={item.caption} onChange={(e) => update(index, { caption: e.target.value })} rows={3} className={input} /></label>
              <label className="block text-sm text-[var(--text-secondary)]">Fit mode<select value={item.fit_mode} onChange={(e) => update(index, { fit_mode: e.target.value as PortfolioMedia['fit_mode'] })} className={input}><option value="auto">Automatic by asset type</option><option value="contain">Contain complete artwork</option><option value="cover">Cover frame (may crop)</option></select></label>
              <p className="text-xs text-[var(--text-muted)]">Logos, identity systems, palettes, typography and stationery always remain contained.</p>
              <div className="grid grid-cols-2 gap-3">{(['width', 'height'] as const).map((key) => <label key={key} className="text-sm capitalize text-[var(--text-secondary)]">{key} (px)<input type="number" min="1" max="20000" step="1" value={item[key] ?? ''} onChange={(e) => update(index, { [key]: e.target.value ? Number(e.target.value) : null })} className={input} /></label>)}</div>
              <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={item.is_visible} onChange={(e) => update(index, { is_visible: e.target.checked })} />Visible on the published work page</label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={action} disabled={index === 0} onClick={() => change(reorderMedia(media, index, -1))}>Move asset {index + 1} up</button>
            <button type="button" className={action} disabled={index === media.length - 1} onClick={() => change(reorderMedia(media, index, 1))}>Move asset {index + 1} down</button>
            <button type="button" className={action} onClick={() => {
              const next = media.filter((m) => m.id !== item.id).map((m, display_order) => ({ ...m, display_order }))
              change(next); if (!next.length) setClearMedia(true)
            }}>Remove asset {index + 1}{media.length === 1 ? ' (clears collection on save)' : ''}</button>
          </div>
        </li>)}
      </ol>
      <button type="button" className={action} onClick={() => add()}>Add asset by URL</button>
      <button type="button" className={action} disabled={!media.length} onClick={removeAllMedia}>Clear all assets on save</button>
      {clearMedia && <p role="status" className="text-sm text-[var(--text-muted)]">All saved creative assets will be removed when you save. Stored files are kept.</p>}
      <ImageUpload key={uploadKey} label="Upload new creative asset" folder={`portfolio/${portfolioId}`} contain disabled={saving || disabled} onUploadingChange={uploadingChanged} onUpload={(url) => { if (url) { add(url); setUploadKey((n) => n + 1) } }} />
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}
      <button type="button" disabled={!dirty || saving || pendingUploads > 0 || conflict} onClick={save} className={action}>{saving ? 'Saving creative media…' : 'Save creative media & capabilities'}</button>
      {pendingUploads > 0 && <p role="status" className="text-sm text-[var(--text-muted)]">Uploading {pendingUploads} asset(s). Creative save is available when uploads finish.</p>}
      <span role="status" className="ml-3 text-sm text-[var(--text-muted)]">{dirty ? 'Unsaved creative changes' : 'No unsaved creative changes'}</span>
    </fieldset>
  )
}
