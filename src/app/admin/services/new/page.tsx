'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

const iconOptions = [
  'web-development', 'ui-ux', 'branding', 'digital-marketing', 
  'ecommerce', 'consulting', 'strategy', 'growth', 'services'
]

function createSlug(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toArray(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean)
}

export default function NewService() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!title.trim()) {
      setMessage('Service title is required.')
      setLoading(false)
      return
    }

    const finalSlug = slug.trim() || createSlug(title)

    const { error } = await supabase.from('services').insert([{
      title: title.trim(),
      slug: finalSlug,
      description: shortDescription.trim(),
      short_description: shortDescription.trim(),
      full_description: fullDescription.trim(),
      icon,
      features: toArray(features),
      benefits: toArray(benefits),
      deliverables: toArray(deliverables),
      timeline: timeline.trim(),
      starting_price: startingPrice.trim(),
      display_order: displayOrder,
      is_featured: isFeatured,
      is_active: isActive,
    }])

    if (error) setMessage(`Error: ${error.message}`)
    else router.push('/admin/services')

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Add New Service</h2>
          <p className="text-sm text-[var(--text-secondary)]">Create a detailed service page with features, benefits, and deliverables.</p>
        </div>
        <Link href="/admin/services" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link>
      </div>

      {message && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Service Title *" value={title} onChange={(v) => { setTitle(v); if (!slug) setSlug(createSlug(v)) }} placeholder="E-Commerce Solutions" />
          <Input label="Slug" value={slug} onChange={setSlug} placeholder="ecommerce-solutions" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Icon</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]">
            {iconOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <Textarea label="Short Description *" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="A short conversion-focused summary..." />
        <Textarea label="Full Description" value={fullDescription} onChange={setFullDescription} rows={6} placeholder="Detailed explanation of the service..." />
        <Textarea label="Features" value={features} onChange={setFeatures} rows={4} placeholder="One per line\nMobile-first design\nConversion structure" />
        <Textarea label="Benefits" value={benefits} onChange={setBenefits} rows={4} placeholder="One per line\nImproves trust\nStrengthens conversion" />
        <Textarea label="Deliverables" value={deliverables} onChange={setDeliverables} rows={4} placeholder="One per line\nHomepage redesign\nResponsive build" />

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Timeline" value={timeline} onChange={setTimeline} placeholder="2–4 weeks" />
          <Input label="Starting Price" value={startingPrice} onChange={setStartingPrice} placeholder="Starting from $500" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Display Order" type="number" value={String(displayOrder)} onChange={(v) => setDisplayOrder(parseInt(v || '0'))} />
          <div className="flex items-center gap-4 pt-7">
            <label className="flex items-center gap-2"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4" /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" /> Active</label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Service'}
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