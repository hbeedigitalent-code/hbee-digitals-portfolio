'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { testimonialForm, testimonialPayload, testimonialQuote, type TestimonialForm, type TestimonialRow } from '@/lib/testimonials'
import { TestimonialQuote } from '@/components/site/proof/TestimonialQuote'
import '@/styles/site-tokens.css'

const inputClass = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3'
const buttonClass = 'rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40'

export default function TestimonialsPage() {
  const router = useRouter()
  const [items, setItems] = useState<TestimonialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<TestimonialForm>(testimonialForm())
  const pending = useRef(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true); setLoadError('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) { setLoadError('Sign in to manage testimonials.'); router.push('/admin/login'); return }
      const { data, error } = await supabase.from('testimonials').select('*').order('display_order', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (error) { setLoadError(errorText(error)) }
    finally { setLoading(false) }
  }

  function edit(item?: TestimonialRow) {
    setEditingId(item?.id || null); setForm(testimonialForm(item)); setShowForm(true); setMessage('')
  }
  function field<K extends keyof TestimonialForm>(key: K, value: TestimonialForm[K]) { setForm(previous => ({ ...previous, [key]: value })) }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (pending.current || loadError || loading) return
    pending.current = true; setBusy(true); setMessage('')
    try {
      const payload = testimonialPayload(form)
      // Explicitly bypass the legacy INSERT default of 5; edits preserve historical ratings.
      const query = editingId ? supabase.from('testimonials').update(payload).eq('id', editingId) : supabase.from('testimonials').insert({ ...payload, rating: null })
      const { data, error } = await query.select('*').single()
      if (error) throw error
      if (!data?.id) throw new Error('No saved testimonial was returned. Reload before trying again.')
      setItems(previous => ordered([...previous.filter(item => item.id !== data.id), data]))
      setShowForm(false); setEditingId(null); setForm(testimonialForm())
      setMessage('Testimonial saved. Homepage visibility updates within about five minutes; up to two visible testimonials are shown in display order.')
    } catch (error) { setMessage(`Error: ${errorText(error)}`) }
    finally { pending.current = false; setBusy(false) }
  }

  async function toggle(item: TestimonialRow) {
    if (pending.current) return
    pending.current = true; setBusy(true); setMessage('')
    try {
      const { data, error } = await supabase.from('testimonials').update({ is_active: item.is_active !== true }).eq('id', item.id).select('*').single()
      if (error) throw error
      if (!data?.id) throw new Error('Visibility was not saved.')
      setItems(previous => previous.map(value => value.id === data.id ? data : value))
      setMessage('Testimonial visibility saved. Trusted Brands visibility is unchanged.')
    } catch (error) { setMessage(`Error: ${errorText(error)}`) }
    finally { pending.current = false; setBusy(false) }
  }

  async function remove(item: TestimonialRow) {
    if (pending.current || !confirm('Delete this testimonial? This cannot be undone.')) return
    pending.current = true; setBusy(true); setMessage('')
    try {
      const { data, error } = await supabase.from('testimonials').delete().eq('id', item.id).select('id').single()
      if (error) throw error
      if (!data?.id) throw new Error('Deletion was not confirmed.')
      setItems(previous => previous.filter(value => value.id !== data.id)); setMessage('Testimonial deleted.')
    } catch (error) { setMessage(`Error: ${errorText(error)}`) }
    finally { pending.current = false; setBusy(false) }
  }

  if (loading) return <p role="status" className="py-12">Loading testimonials...</p>
  if (loadError) return <div role="alert" className="space-y-3 p-6"><p>Error loading testimonials: {loadError}</p><button type="button" onClick={load} className={buttonClass}>Retry loading</button></div>
  const preview = testimonialQuote({ ...form, id: 'preview' }, true)

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-black">Testimonials</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Client statements from the testimonials collection. Trusted Brands has separate visibility.</p></div>
      {!showForm && <button type="button" disabled={busy} onClick={() => edit()} className={buttonClass}>New testimonial</button>}
    </div>
    <p className="text-sm text-[var(--text-muted)]">The homepage shows up to two visible, nonempty testimonials in display order. Quotes appear in full. New testimonials start hidden. Confirm permission, attribution and source evidence before making one visible.</p>
    <p className="text-xs text-[var(--text-muted)]">Legacy trust-section quotes and video proofs are separate sources and are not merged here. Ratings and featured values remain stored but are not presented by the homepage.</p>
    {message && <p role={message.startsWith('Error:') ? 'alert' : 'status'} className="rounded-lg border border-[var(--border)] p-4 text-sm">{message}</p>}
    {showForm && <form onSubmit={save}>
      <fieldset disabled={busy} className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h2 className="font-bold">{editingId ? 'Edit testimonial' : 'Create testimonial'}</h2>
        <label className="block text-sm font-semibold">Name<input required className={inputClass} value={form.name} onChange={e => field('name', e.target.value)} /></label>
        <label className="block text-sm font-semibold">Role / title (optional)<input className={inputClass} value={form.position} onChange={e => field('position', e.target.value)} /></label>
        <label className="block text-sm font-semibold">Company / brand (optional)<input className={inputClass} value={form.company} onChange={e => field('company', e.target.value)} /></label>
        <label className="block text-sm font-semibold">Testimonial quote<textarea required rows={6} className={inputClass} value={form.content} onChange={e => field('content', e.target.value)} /></label>
        <p className="text-xs text-[var(--text-muted)]">Use the original wording. Quotes are plain text; HTML is displayed as text. No rating is required or added by this editor.</p>
        <label className="block text-sm font-semibold">Avatar / logo URL (optional)<input className={inputClass} value={form.image_url} onChange={e => field('image_url', e.target.value)} /></label>
        <label className="block text-sm font-semibold">Display order<input type="number" step="1" className={inputClass} value={form.display_order} onChange={e => field('display_order', e.target.value)} /></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => field('is_active', e.target.checked)} />Visible on website</label>
        <div className="flex flex-wrap gap-3"><button type="submit" className={buttonClass}>{busy ? 'Saving...' : 'Save testimonial'}</button><button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className={buttonClass}>Cancel</button></div>
        <div data-surface="site" className="rounded-lg bg-white p-4"><p className="mb-3 text-sm text-hb-fg-body">Public quote preview (visibility does not hide this preview)</p>{preview ? <TestimonialQuote quote={preview} /> : <p className="text-sm text-hb-fg-body">Enter a name and quote to preview.</p>}</div>
      </fieldset>
    </form>}
    <div className="grid gap-4">
      {items.map(item => {
        const quote = testimonialQuote(item, true)
        return <article key={item.id} className="min-w-0 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex flex-wrap gap-3 text-sm"><span>{item.is_active === true ? 'Visible' : 'Hidden'}</span><span>Order: {String(item.display_order ?? 0)}</span>{!quote && <span>Incomplete: excluded publicly</span>}</div>
          {quote ? <div data-surface="site"><TestimonialQuote quote={quote} /></div> : <p className="text-sm">Missing name or quote. Edit to complete this record.</p>}
          {!showForm && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => edit(item)} className={buttonClass}>Edit</button><button type="button" disabled={busy} onClick={() => toggle(item)} className={buttonClass}>{item.is_active === true ? 'Hide' : 'Show'}</button><button type="button" disabled={busy} onClick={() => remove(item)} className={buttonClass}>Delete</button></div>}
        </article>
      })}
      {!items.length && <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm">No testimonials yet. The public section stays hidden until a valid testimonial is visible.</p>}
    </div>
  </div>
}

function ordered(items: TestimonialRow[]) { return [...items].sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)) }
function errorText(error: unknown) { return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.' }
