// src/app/admin/before-after/[id]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface BeforeAfterItem {
  id: string
  title: string
  client_name: string
  slug: string
  category: string
  before_image: string
  after_image: string
  metric_value: string
  metric_label: string
  description: string
  results_summary: string
  is_active: boolean
  display_order: number
  is_before_after: boolean
  project_type: string
}

export default function EditBeforeAfterPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<BeforeAfterItem>({
    id: '',
    title: '',
    client_name: '',
    slug: '',
    category: '',
    before_image: '',
    after_image: '',
    metric_value: '',
    metric_label: '',
    description: '',
    results_summary: '',
    is_active: true,
    display_order: 0,
    is_before_after: true,
    project_type: 'Website Transformation'
  })

  useEffect(() => {
    fetchItem()
  }, [id])

  async function fetchItem() {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      setFormData(data)
    } else {
      setError('Item not found')
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileUpload = async (field: 'before_image' | 'after_image') => {
    if (!fileInputRef.current?.files?.[0]) return

    const file = fileInputRef.current.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `before-after/${fileName}`

    setUploading(true)
    setError(null)

    const { error: uploadError } = await supabase.storage
      .from('portfolio-images')
      .upload(filePath, file)

    if (uploadError) {
      setError(`Failed to upload image: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(filePath)

    setFormData(prev => ({
      ...prev,
      [field]: urlData.publicUrl
    }))

    setUploading(false)
  }

  const generateSlug = () => {
    const base = formData.client_name || formData.title || ''
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData(prev => ({ ...prev, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('portfolio_items')
      .update({
        title: formData.title,
        client_name: formData.client_name,
        slug: formData.slug,
        category: formData.category,
        before_image: formData.before_image,
        after_image: formData.after_image,
        metric_value: formData.metric_value,
        metric_label: formData.metric_label,
        description: formData.description,
        results_summary: formData.results_summary,
        is_active: formData.is_active,
        display_order: formData.display_order,
        is_before_after: formData.is_before_after,
        project_type: formData.project_type
      })
      .eq('id', id)

    if (updateError) {
      setError(`Failed to update: ${updateError.message}`)
      setSaving(false)
      return
    }

    router.push('/admin/before-after')
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/before-after"
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-section)] transition"
        >
          <SvgIcon name="chevron-left" size={20} color="var(--text-muted)" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Transformation</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {formData.client_name || formData.title || 'Untitled'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            formData.is_active 
              ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]' 
              : 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
          }`}>
            {formData.is_active ? 'Active' : 'Inactive'}
          </span>
          <Link
            href={`/before-after`}
            target="_blank"
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-section)] transition"
          >
            View Live
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-500">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Client Name *</label>
            <input
              type="text"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-section)] transition"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select category</option>
              <option value="Ecommerce">Ecommerce</option>
              <option value="Shopify">Shopify</option>
              <option value="Website Redesign">Website Redesign</option>
              <option value="Branding">Branding</option>
              <option value="UX/UI">UX/UI</option>
              <option value="Performance">Performance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Metric Value</label>
            <input
              type="text"
              name="metric_value"
              value={formData.metric_value}
              onChange={handleChange}
              placeholder="e.g. 245%"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Metric Label</label>
            <input
              type="text"
              name="metric_label"
              value={formData.metric_label}
              onChange={handleChange}
              placeholder="e.g. Increase in Revenue"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Results Summary</label>
            <textarea
              name="results_summary"
              value={formData.results_summary}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Display Order</label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-page)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_before_after"
                checked={formData.is_before_after}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-page)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Show in Before/After</span>
            </label>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Before Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => handleFileUpload('before_image')}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-page)] p-6 text-center text-[var(--text-muted)] hover:border-[var(--accent)] transition"
            >
              {formData.before_image ? (
                <div className="space-y-2">
                  <SvgIcon name="check" size={24} color="var(--accent-lime)" />
                  <p className="text-sm text-[var(--text-primary)]">Image uploaded</p>
                  <p className="text-xs text-[var(--text-muted)]">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <SvgIcon name="image" size={32} color="var(--text-muted)" />
                  <p className="text-sm text-[var(--text-muted)]">Click to upload before image</p>
                </div>
              )}
            </button>
            {formData.before_image && (
              <img
                src={formData.before_image}
                alt="Before"
                className="mt-2 max-h-40 w-full rounded-lg object-cover"
              />
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">After Image</label>
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (!file) return
                  
                  const fileExt = file.name.split('.').pop()
                  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                  const filePath = `before-after/${fileName}`

                  setUploading(true)
                  const { error: uploadError } = await supabase.storage
                    .from('portfolio-images')
                    .upload(filePath, file)

                  if (!uploadError) {
                    const { data: urlData } = supabase.storage
                      .from('portfolio-images')
                      .getPublicUrl(filePath)
                    setFormData(prev => ({ ...prev, after_image: urlData.publicUrl }))
                  }
                  setUploading(false)
                }
                input.click()
              }}
              disabled={uploading}
              className="w-full rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-page)] p-6 text-center text-[var(--text-muted)] hover:border-[var(--accent)] transition"
            >
              {formData.after_image ? (
                <div className="space-y-2">
                  <SvgIcon name="check" size={24} color="var(--accent-lime)" />
                  <p className="text-sm text-[var(--text-primary)]">Image uploaded</p>
                  <p className="text-xs text-[var(--text-muted)]">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <SvgIcon name="image" size={32} color="var(--text-muted)" />
                  <p className="text-sm text-[var(--text-muted)]">Click to upload after image</p>
                </div>
              )}
            </button>
            {formData.after_image && (
              <img
                src={formData.after_image}
                alt="After"
                className="mt-2 max-h-40 w-full rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-[var(--accent)] px-8 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/before-after"
            className="rounded-full border border-[var(--border)] px-8 py-3 font-bold text-[var(--text-muted)] transition hover:bg-[var(--bg-section)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}