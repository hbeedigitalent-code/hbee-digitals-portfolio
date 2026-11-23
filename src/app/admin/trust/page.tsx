'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MediaPicker from '@/components/admin/media/MediaPicker'
import type { MediaAsset } from '@/lib/media/media-types'
import { isTrustRelationship, parseTrustLogos, trustBrandsPayload, trustLogoUrl, TRUST_RELATIONSHIPS, TRUST_RELATIONSHIP_LABELS, type TrustLogo } from '@/lib/trusted-brands'

const inputClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm'
const buttonClass = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold disabled:opacity-40'

export default function AdminTrustPage() {
  const [id, setId] = useState<string | number | null>(null)
  const [logos, setLogos] = useState<TrustLogo[]>([])
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const pending = useRef(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true); setLoadError('')
    try {
      const { data, error } = await supabase.from('trust_section').select('id,partner_logos,is_active').maybeSingle()
      if (error) throw error
      if (data) {
        if (data.id == null) throw new Error('The trust section has no record ID. Saving is disabled.')
        setLogos(parseTrustLogos(data.partner_logos)); setActive(data.is_active === true); setId(data.id)
      } else { setLogos([]); setActive(true); setId(null) }
    } catch (error) { setLoadError(errorText(error)) }
    finally { setLoading(false) }
  }

  function updateLogo(index: number, patch: Partial<TrustLogo>) {
    setLogos(previous => previous.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function moveLogo(index: number, direction: -1 | 1) {
    setLogos(previous => {
      const target = index + direction
      if (target < 0 || target >= previous.length) return previous
      const next = [...previous]; [next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  /** A logo chosen from (or uploaded into) the Media Library. The stored logo stays a plain URL, so public pages are unchanged. */
  function selectAsset(index: number, asset: MediaAsset) {
    setLogos(previous => previous.map((row, i) => i === index ? {
      ...row, logo: asset.public_url, asset_id: asset.id,
      name: row.name.trim() ? row.name : asset.title,
      alt_text: typeof row.alt_text === 'string' && row.alt_text.trim() ? row.alt_text : (asset.is_decorative ? '' : asset.alt_text),
    } : row))
    setMessage('Logo selected from the Media Library. Save Trusted Brands to publish this change.')
  }

  /** Editing the raw URL detaches the logo from its Media Library asset, so the link never describes a different file. */
  function setManualLogoUrl(index: number, value: string) {
    setLogos(previous => previous.map((row, i) => {
      if (i !== index) return row
      const { asset_id: _detached, ...rest } = row
      return { ...rest, logo: value } as TrustLogo
    }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (pending.current || loadError || loading) return
    pending.current = true; setSaving(true); setMessage('')
    try {
      const payload = trustBrandsPayload(logos, active)
      const query = id == null ? supabase.from('trust_section').insert(payload) : supabase.from('trust_section').update(payload).eq('id', id)
      const { data, error } = await query.select('id,partner_logos,is_active').single()
      if (error) throw error
      if (!data || data.id == null) throw new Error('No trust section was saved. Reload and try again.')
      setId(data.id); setLogos(parseTrustLogos(data.partner_logos)); setActive(data.is_active === true)
      setMessage('Trusted Brands saved. The homepage refreshes within about five minutes.')
    } catch (error) { setMessage(`Error: ${errorText(error)}`) }
    finally { pending.current = false; setSaving(false) }
  }

  if (loading) return <p role="status" className="py-12">Loading Trusted Brands...</p>
  if (loadError) return <div role="alert" className="space-y-3 p-6"><p>Error loading Trusted Brands: {loadError}</p><button type="button" onClick={load} className={buttonClass}>Retry loading</button></div>
  const busy = saving

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black text-[var(--text-primary)]">Trusted Brands</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Manage the homepage band: “Selected brands we’ve supported”. Add only brands whose work or relationship you can substantiate.</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Stored array order controls display order. Testimonials are managed separately. This page preserves other trust-section content.</p></div>
    {message && <p role={message.startsWith('Error:') ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${message.startsWith('Error:') ? 'border-red-500/30 text-red-500' : 'border-[var(--accent)]/30 text-[var(--accent)]'}`}>{message}</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy} className="min-w-0 space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 disabled:opacity-70">
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />Trust section visible on website</label>
        <p className="text-xs text-[var(--text-muted)]">Controls trusted brands and the legacy Reviews &amp; Trust section. Homepage testimonials use their own visibility in Testimonials and are independent of this switch. Each brand also has its own visibility below.</p>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Brand logos ({logos.length})</h2><button type="button" onClick={() => setLogos(previous => [...previous, { name: '', logo: '', active: true, relationship: 'none' }])} className={buttonClass}>Add brand</button></div>
        {!logos.length && <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">No brands yet. Add a brand and its logo to begin. An empty collection displays no public band.</p>}
        {logos.map((row, index) => <div key={index} className="grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-[128px_1fr_auto]">
          <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-white p-3">
            {trustLogoUrl(row.logo) ? <img src={trustLogoUrl(row.logo)} alt={row.name || 'Brand logo preview'} className="h-auto max-h-16 w-auto max-w-full object-contain" /> : <span className="text-xs text-gray-600">No valid image</span>}
          </div>
          <div className="space-y-3">
            <label className="block text-sm">Brand name<input className={inputClass} value={row.name} onChange={e => updateLogo(index, { name: e.target.value })} /></label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={buttonClass} onClick={() => setPickerIndex(index)}>{row.logo ? 'Replace logo' : 'Choose or upload logo'}</button>
              <span className="text-xs text-[var(--text-muted)]">{typeof row.asset_id === 'string' ? 'Linked to the Media Library.' : row.logo ? 'Using a manually entered URL.' : 'Pick an existing logo or upload a new one.'}</span>
            </div>
            <label className="block text-sm">Logo description (alt text)<input className={inputClass} value={typeof row.alt_text === 'string' ? row.alt_text : ''} maxLength={300} placeholder={row.name ? `Leave blank to use "${row.name}"` : 'Leave blank to use the brand name'} onChange={e => updateLogo(index, { alt_text: e.target.value })} /></label>
            <details className="rounded-lg border border-[var(--border)] p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Advanced: logo URL</summary>
              <label className="mt-3 block text-sm">Logo URL<input className={inputClass} value={row.logo} placeholder="https://… or /images/…" onChange={e => setManualLogoUrl(index, e.target.value)} /></label>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Existing logos keep working through their URL. Typing here unlinks the logo from the Media Library.</p>
            </details>
            <label className="block text-sm">Brand website (optional)<input className={inputClass} value={typeof row.url === 'string' ? row.url : ''} onChange={e => updateLogo(index, { url: e.target.value })} /></label>
            <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
              <label className="block text-sm">Relationship (admin record)<select className={inputClass} value={row.relationship ?? 'none'} onChange={e => { const value = e.target.value; if (isTrustRelationship(value)) updateLogo(index, { relationship: value }) }}>
                {TRUST_RELATIONSHIPS.map(value => <option key={value} value={value}>{TRUST_RELATIONSHIP_LABELS[value]}</option>)}</select></label>
              {row.relationship === 'custom' && <label className="block text-sm">Custom wording<input className={inputClass} value={typeof row.relationship_label === 'string' ? row.relationship_label : ''} maxLength={60} onChange={e => updateLogo(index, { relationship_label: e.target.value })} /></label>}
              <p className="text-xs text-[var(--text-muted)]">Recorded for your reference only. It is not shown on the website, and choosing “No relationship stated” claims nothing.</p>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.active} onChange={e => updateLogo(index, { active: e.target.checked })} />{row.active ? 'Visible on website' : 'Hidden on website'}</label>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <button type="button" aria-label={`Move brand ${index + 1} up`} disabled={index === 0} onClick={() => moveLogo(index, -1)} className={buttonClass}>Move up</button>
            <button type="button" aria-label={`Move brand ${index + 1} down`} disabled={index === logos.length - 1} onClick={() => moveLogo(index, 1)} className={buttonClass}>Move down</button>
            <button type="button" aria-label={`Remove brand ${index + 1}`} onClick={() => setLogos(previous => previous.filter((_, i) => i !== index))} className={buttonClass}>Remove</button>
          </div>
        </div>)}
        <p className="text-xs text-[var(--text-muted)]">Visible brands form one continuous row, with visual copies added automatically for a seamless loop. Reduced-motion users get a static, horizontally scrollable row.</p>
        <button type="submit" className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Save Trusted Brands'}</button>
      </fieldset>
    </form>
    <MediaPicker open={pickerIndex !== null} onClose={() => setPickerIndex(null)} heading="Choose a brand logo"
      initialCategory="brand_logo" uploadCategory="brand_logo" suggestedTitle={pickerIndex !== null ? logos[pickerIndex]?.name ?? '' : ''}
      selectedId={pickerIndex !== null && typeof logos[pickerIndex]?.asset_id === 'string' ? logos[pickerIndex].asset_id as string : null}
      selectedUrl={pickerIndex !== null ? logos[pickerIndex]?.logo ?? null : null}
      onSelect={asset => { if (pickerIndex !== null) selectAsset(pickerIndex, asset) }} />
  </div>
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.'
}
