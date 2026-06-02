'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import SvgIcon from '@/components/ui/SvgIcon'

type PortfolioForm = {
  id?: string
  title: string
  slug: string
  client_name: string
  category: string
  project_type: string
  description: string
  image_url: string
  metric_label: string
  metric_value: string
  industry: string
  technology: string
  website_url: string
  brief: string
  results_summary: string
  before_image: string
  after_image: string
  gallery_images: string
  result_metrics: string
  display_order: number
  featured: boolean
  is_active: boolean
  is_before_after: boolean
}

const defaultForm: PortfolioForm = {
  title: '',
  slug: '',
  client_name: '',
  category: '',
  project_type: '',
  description: '',
  image_url: '',
  metric_label: '',
  metric_value: '',
  industry: '',
  technology: '',
  website_url: '',
  brief: '',
  results_summary: '',
  before_image: '',
  after_image: '',
  gallery_images: '[]',
  result_metrics: '[]',
  display_order: 0,
  featured: false,
  is_active: true,
  is_before_after: false,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function formatJson(value: any) {
  try {
    return JSON.stringify(value || [], null, 2)
  } catch {
    return '[]'
  }
}

function parseJson(value: string) {
  try {
    return JSON.parse(value || '[]')
  } catch {
    throw new Error('Invalid JSON format in Gallery Images or Result Metrics.')
  }
}

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState<PortfolioForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)

    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('display_order', { ascending: true })

    setItems(data || [])
    setLoading(false)
  }

  function updateField<K extends keyof PortfolioForm>(
    key: K,
    value: PortfolioForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function resetForm() {
    setForm(defaultForm)
    setMessage('')
    setErrorMessage('')
  }

  function editItem(item: any) {
    setForm({
      id: item.id,
      title: item.title || item.client_name || '',
      slug: item.slug || '',
      client_name: item.client_name || item.title || '',
      category: item.category || '',
      project_type: item.project_type || '',
      description: item.description || '',
      image_url: item.image_url || item.image || '',
      metric_label: item.metric_label || '',
      metric_value: item.metric_value || '',
      industry: item.industry || '',
      technology: item.technology || '',
      website_url: item.website_url || '',
      brief: item.brief || '',
      results_summary: item.results_summary || '',
      before_image: item.before_image || '',
      after_image: item.after_image || '',
      gallery_images: formatJson(item.gallery_images),
      result_metrics: formatJson(item.result_metrics),
      display_order: item.display_order || 0,
      featured: item.featured || false,
      is_active: item.is_active ?? true,
      is_before_after: item.is_before_after || false,
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title || form.client_name),
        client_name: form.client_name || form.title,
        category: form.category,
        project_type: form.project_type,
        description: form.description,
        image_url: form.image_url,
        metric_label: form.metric_label,
        metric_value: form.metric_value,
        industry: form.industry,
        technology: form.technology,
        website_url: form.website_url,
        brief: form.brief,
        results_summary: form.results_summary,
        before_image: form.before_image,
        after_image: form.after_image,
        gallery_images: parseJson(form.gallery_images),
        result_metrics: parseJson(form.result_metrics),
        display_order: Number(form.display_order) || 0,
        featured: form.featured,
        is_active: form.is_active,
        is_before_after: form.is_before_after,
        updated_at: new Date().toISOString(),
      }

      const response = form.id
        ? await supabase.from('portfolio_items').update(payload).eq('id', form.id)
        : await supabase.from('portfolio_items').insert([payload])

      if (response.error) {
        setErrorMessage(response.error.message)
        setSaving(false)
        return
      }

      setMessage(form.id ? 'Portfolio item updated successfully.' : 'Portfolio item created successfully.')
      resetForm()
      await fetchItems()
    } catch (error: any) {
      setErrorMessage(error.message || 'Something went wrong.')
    }

    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this portfolio item?')) return

    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    await fetchItems()
  }

  async function toggleFeatured(id: string, currentFeatured: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ featured: !currentFeatured })
      .eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    await fetchItems()
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_active: !currentActive })
      .eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    await fetchItems()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Portfolio & Case Studies</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage portfolio items, case studies, and before/after transformations.</p>
        </div>
        <button
          onClick={resetForm}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
        >
          + Create New Project
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4 text-sm font-bold text-[var(--accent)]">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Create/Edit Form */}
      {form.id || form.title || form.client_name ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              {form.id ? 'Edit Portfolio Item' : 'Create New Portfolio Item'}
            </h3>
            <button onClick={resetForm} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Project Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => {
                    updateField('title', e.target.value)
                    if (!form.id) updateField('slug', slugify(e.target.value))
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateField('slug', slugify(e.target.value))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">URL: /portfolio/{form.slug || '...'}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Client Name</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="Fashion, E-commerce, Healthcare"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Project Type</label>
                <input
                  type="text"
                  value={form.project_type}
                  onChange={(e) => updateField('project_type', e.target.value)}
                  placeholder="Shopify Redesign + CRO"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Short Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Metric Value</label>
                <input
                  type="text"
                  value={form.metric_value}
                  onChange={(e) => updateField('metric_value', e.target.value)}
                  placeholder="+38%"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Metric Label</label>
                <input
                  type="text"
                  value={form.metric_label}
                  onChange={(e) => updateField('metric_label', e.target.value)}
                  placeholder="Conversion Lift"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ImageUpload
                label="Main Image"
                currentImage={form.image_url}
                folder="portfolio"
                onUpload={(url) => updateField('image_url', url)}
              />
              <ImageUpload
                label="Before Image"
                currentImage={form.before_image}
                folder="portfolio-before-after"
                onUpload={(url) => updateField('before_image', url)}
              />
              <ImageUpload
                label="After Image"
                currentImage={form.after_image}
                folder="portfolio-before-after"
                onUpload={(url) => updateField('after_image', url)}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">The Brief</label>
                <textarea
                  rows={4}
                  value={form.brief}
                  onChange={(e) => updateField('brief', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Results Summary</label>
                <textarea
                  rows={4}
                  value={form.results_summary}
                  onChange={(e) => updateField('results_summary', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Website URL</label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => updateField('website_url', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => updateField('featured', e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Featured on Homepage</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Active / Visible</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.is_before_after}
                  onChange={(e) => updateField('is_before_after', e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Show in Before/After</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[var(--accent)] py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? 'Saving...' : form.id ? 'Update Portfolio Item' : 'Create Portfolio Item'}
            </button>
          </form>
        </div>
      ) : null}

      {/* Portfolio Items List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Existing Portfolio Items</h3>
        {items.length === 0 ? (
          <p className="py-8 text-center text-[var(--text-muted)]">No portfolio items yet. Create your first project above!</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
                <div className="flex gap-4">
                  {item.image_url && (
                    <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-card)]">
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[var(--text-primary)]">{item.title || item.client_name}</h4>
                      {item.featured && (
                        <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">Featured</span>
                      )}
                      {!item.is_active && (
                        <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-bold text-gray-400">Hidden</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.category || 'Uncategorized'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/portfolio/${item.id}`}
                        className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleFeatured(item.id, item.featured)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${item.featured ? 'bg-yellow-500/20 text-yellow-400' : 'border border-[var(--border)] text-[var(--text-muted)]'}`}
                      >
                        {item.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => toggleActive(item.id, item.is_active)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-400'}`}
                      >
                        {item.is_active ? 'Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}