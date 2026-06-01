'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

const iconOptions = [
  'web-development', 'ui-ux', 'branding', 'digital-marketing', 
  'ecommerce', 'consulting', 'strategy', 'growth', 'services'
]

function createSlug(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function arrayToText(value: any) {
  if (!value) return ''
  if (Array.isArray(value)) return value.join('\n')
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.join('\n') } catch { return value }
  }
  return ''
}

function toArray(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean)
}

export default function EditService() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [icon, setIcon] = useState('services')
  const [features, setFeatures] = useState('')
  const [benefits, setBenefits] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [timeline, setTimeline] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    async function fetchService() {
      const { data, error } = await supabase.from('services').select('*').eq('id', id).single()
      if (error) setMessage(`Error: ${error.message}`)
      if (data) {
        setTitle(data.title || '')
        setSlug(data.slug || createSlug(data.title || ''))
        setShortDescription(data.short_description || data.description || '')
        setFullDescription(data.full_description || '')
        setIcon(data.icon || 'services')
        setFeatures(arrayToText(data.features))
        setBenefits(arrayToText(data.benefits))
        setDeliverables(arrayToText(data.deliverables))
        setTimeline(data.timeline || '')
        setStartingPrice(data.starting_price || '')
        setDisplayOrder(data.display_order || 0)
        setIsFeatured(data.is_featured || false)
        setIsActive(data.is_active !== false)
      }
      setLoading(false)
    }
    if (id) fetchService()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    if (!title.trim()) { setMessage('Title required.'); setSaving(false); return }

    const finalSlug = slug.trim() || createSlug(title)
    const { error } = await supabase.from('services').update({
      title: title.trim(), slug: finalSlug, description: shortDescription.trim(), short_description: shortDescription.trim(),
      full_description: fullDescription.trim(), icon, features: toArray(features), benefits: toArray(benefits),
      deliverables: toArray(deliverables), timeline: timeline.trim(), starting_price: startingPrice.trim(),
      display_order: displayOrder, is_featured: isFeatured, is_active: isActive, updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) setMessage(`Error: ${error.message}`)
    else router.push('/admin/services')
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this service?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) setMessage(`Error: ${error.message}`)
    else router.push('/admin/services')
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Edit Service</h2>
          <p className="text-sm text-[var(--text-secondary)]">Update service details, content, and visibility.</p>
        </div>
        <Link href="/admin/services" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Service Title *" value={title} onChange={(v) => { setTitle(v); if (!slug) setSlug(createSlug(v)) }} />
          <Input label="Slug" value={slug} onChange={setSlug} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Icon</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
            {iconOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <Textarea label="Short Description *" value={shortDescription} onChange={setShortDescription} rows={3} />
        <Textarea label="Full Description" value={fullDescription} onChange={setFullDescription} rows={6} />
        <Textarea label="Features" value={features} onChange={setFeatures} rows={4} />
        <Textarea label="Benefits" value={benefits} onChange={setBenefits} rows={4} />
        <Textarea label="Deliverables" value={deliverables} onChange={setDeliverables} rows={4} />

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Timeline" value={timeline} onChange={setTimeline} />
          <Input label="Starting Price" value={startingPrice} onChange={setStartingPrice} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Display Order" type="number" value={String(displayOrder)} onChange={(v) => setDisplayOrder(parseInt(v || '0'))} />
          <div className="flex items-center gap-4 pt-7">
            <label className="flex items-center gap-2"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50">
            {saving ? 'Updating...' : 'Update Service'}
          </button>
          <button type="button" onClick={handleDelete} className="rounded-full border border-red-500/30 px-6 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/10">
            Delete
          </button>
          <Link href="/admin/services" className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-black text-[var(--text-muted)] transition hover:border-[var(--accent)]/25">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 outline-none" placeholder={placeholder} />
    </div>
  )
}

function Textarea({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 outline-none" placeholder={placeholder} />
    </div>
  )
}