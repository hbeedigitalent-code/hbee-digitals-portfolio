'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const iconOptions = [
  'web-development',
  'ui-ux',
  'branding',
  'digital-marketing',
  'ecommerce',
  'consulting',
  'strategy',
  'growth',
  'services',
]

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function arrayToText(value: any) {
  if (!value) return ''

  if (Array.isArray(value)) return value.join('\n')

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.join('\n')
    } catch {
      return value
    }
  }

  return ''
}

function toArray(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function EditService() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchService() {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setMessage(`Error loading service: ${error.message}`)
      }

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

    if (!title.trim()) {
      setMessage('Service title is required.')
      setSaving(false)
      return
    }

    if (shortDescription.trim().length < 25) {
      setMessage('Short description should be more detailed.')
      setSaving(false)
      return
    }

    const finalSlug = slug.trim() || createSlug(title)

    const { error } = await supabase
      .from('services')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      router.push('/admin/services')
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this service?')) return

    const { error } = await supabase.from('services').delete().eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      router.push('/admin/services')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
          <div className="container mx-auto">
            <h1 className="text-xl font-bold text-white">Edit Service</h1>
          </div>
        </nav>

        <div className="container mx-auto max-w-3xl p-6">
          <p className="text-gray-600">Loading service...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-white">Edit Service</h1>
        </div>
      </nav>

      <div className="container mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Update Service</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage deeper service content for the public service pages.
            </p>
          </div>

          <Link href="/admin/services" className="text-gray-600 hover:text-gray-800">
            ← Back
          </Link>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
          <Input
            label="Service Title *"
            value={title}
            onChange={(value) => {
              setTitle(value)
              if (!slug) setSlug(createSlug(value))
            }}
            placeholder="E-Commerce Solutions"
          />

          <Input
            label="Slug"
            value={slug}
            onChange={setSlug}
            placeholder="ecommerce-solutions"
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              {iconOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Save icon name only. Do not use /svgs/name.svg.
            </p>
          </div>

          <Textarea
            label="Short Description *"
            value={shortDescription}
            onChange={setShortDescription}
            rows={3}
            placeholder="A short conversion-focused summary of the service."
          />

          <Textarea
            label="Full Description"
            value={fullDescription}
            onChange={setFullDescription}
            rows={6}
            placeholder="Explain the service in detail, including who it helps and the outcome."
          />

          <Textarea
            label="Features"
            value={features}
            onChange={setFeatures}
            rows={5}
            placeholder={'One per line\nMobile-first design\nConversion structure\nSEO foundation'}
          />

          <Textarea
            label="Benefits"
            value={benefits}
            onChange={setBenefits}
            rows={5}
            placeholder={'One per line\nImproves digital trust\nStrengthens conversion flow'}
          />

          <Textarea
            label="Deliverables"
            value={deliverables}
            onChange={setDeliverables}
            rows={5}
            placeholder={'One per line\nHomepage redesign\nResponsive page build\nSpeed optimization'}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Timeline"
              value={timeline}
              onChange={setTimeline}
              placeholder="2–4 weeks"
            />

            <Input
              label="Starting Price"
              value={startingPrice}
              onChange={setStartingPrice}
              placeholder="Starting from $500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Display Order"
              type="number"
              value={String(displayOrder)}
              onChange={(value) => setDisplayOrder(parseInt(value || '0', 10))}
            />

            <div className="space-y-3 pt-7">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Featured service</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Active / visible</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {saving ? 'Updating...' : 'Update Service'}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Delete
            </button>

            <Link
              href="/admin/services"
              className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={label.includes('*')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <textarea
        required={label.includes('*')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border p-2 leading-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  )
}