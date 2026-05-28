'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'

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

    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Admin / Portfolio
            </p>

            <h1 className="text-4xl font-black tracking-[-0.05em]">
              Portfolio & Case Studies
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Create portfolio cards, case studies, before/after images, result metrics,
              and project details from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="w-fit rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-6 py-3 text-sm font-black text-[#39D97A]"
          >
            New Portfolio Item
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mb-10 space-y-6 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field
              label="Project Title"
              value={form.title}
              onChange={(value) => {
                updateField('title', value)
                if (!form.id) updateField('slug', slugify(value))
              }}
              required
            />

            <Field
              label="Slug"
              value={form.slug}
              onChange={(value) => updateField('slug', slugify(value))}
              required
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Field
              label="Client Name"
              value={form.client_name}
              onChange={(value) => updateField('client_name', value)}
            />

            <Field
              label="Category"
              value={form.category}
              onChange={(value) => updateField('category', value)}
              placeholder="E-Commerce, CRO, Branding"
            />

            <Field
              label="Project Type"
              value={form.project_type}
              onChange={(value) => updateField('project_type', value)}
              placeholder="Shopify Redesign + CRO"
            />
          </div>

          <Textarea
            label="Short Description"
            value={form.description}
            onChange={(value) => updateField('description', value)}
            rows={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <ImageUpload
              label="Main Portfolio Image"
              currentImage={form.image_url}
              folder="portfolio"
              onUpload={(url) => updateField('image_url', url)}
            />

            <div className="grid gap-5">
              <Field
                label="Metric Label"
                value={form.metric_label}
                onChange={(value) => updateField('metric_label', value)}
                placeholder="CONVERSION LIFT"
              />

              <Field
                label="Metric Value"
                value={form.metric_value}
                onChange={(value) => updateField('metric_value', value)}
                placeholder="+38%"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Field
              label="Industry"
              value={form.industry}
              onChange={(value) => updateField('industry', value)}
              placeholder="Food & Beverage"
            />

            <Field
              label="Technology"
              value={form.technology}
              onChange={(value) => updateField('technology', value)}
              placeholder="Shopify, Klaviyo, CRO"
            />

            <Field
              label="Website URL"
              value={form.website_url}
              onChange={(value) => updateField('website_url', value)}
              placeholder="https://example.com"
            />
          </div>

          <Textarea
            label="The Brief"
            value={form.brief}
            onChange={(value) => updateField('brief', value)}
            rows={6}
          />

          <Textarea
            label="Results Summary"
            value={form.results_summary}
            onChange={(value) => updateField('results_summary', value)}
            rows={6}
          />

          <div className="grid gap-5 lg:grid-cols-2">
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

          <JsonField
            label="Gallery Images JSON"
            value={form.gallery_images}
            onChange={(value) => updateField('gallery_images', value)}
            helper='Example: ["/image-1.jpg", "/image-2.jpg"]'
          />

          <JsonField
            label="Result Metrics JSON"
            value={form.result_metrics}
            onChange={(value) => updateField('result_metrics', value)}
            helper='Example: [{"label":"Conversion Lift","value":"+38%"},{"label":"Speed Score","value":"91"}]'
          />

          <div className="grid gap-5 lg:grid-cols-4">
            <Field
              label="Display Order"
              type="number"
              value={String(form.display_order)}
              onChange={(value) => updateField('display_order', Number(value))}
            />

            <Toggle
              label="Featured"
              checked={form.featured}
              onChange={(value) => updateField('featured', value)}
            />

            <Toggle
              label="Active"
              checked={form.is_active}
              onChange={(value) => updateField('is_active', value)}
            />

            <Toggle
              label="Before / After"
              checked={form.is_before_after}
              onChange={(value) => updateField('is_before_after', value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? 'Saving...' : form.id ? 'Update Portfolio Item' : 'Create Portfolio Item'}
          </button>
        </form>

        <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 sm:p-6">
          <h2 className="mb-5 text-2xl font-black tracking-[-0.04em]">
            Existing Portfolio Items
          </h2>

          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-[#07111F]" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#1E314A] bg-[#07111F] p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-[#0E1B2D]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black text-white">
                        {item.title || item.client_name}
                      </p>

                      <p className="mt-1 text-sm text-[#39D97A]">
                        {item.metric_value || 'No metric'} {item.metric_label || ''}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
                        {item.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editItem(item)}
                          className="rounded-full bg-[#39D97A] px-4 py-2 text-xs font-black text-[#06101F]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="rounded-full border border-red-400/25 bg-red-400/10 px-4 py-2 text-xs font-black text-red-300"
                        >
                          Delete
                        </button>

                        <span className="rounded-full border border-[#1E314A] px-4 py-2 text-xs font-bold text-white/45">
                          {item.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <p className="text-sm text-white/45">
                  No portfolio items yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#39D97A]/30"
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/25 focus:border-[#39D97A]/30"
      />
    </div>
  )
}

function JsonField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <textarea
        rows={7}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 font-mono text-xs leading-6 text-white outline-none transition focus:border-[#39D97A]/30"
      />

      {helper && (
        <p className="mt-2 text-xs leading-6 text-white/45">{helper}</p>
      )}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] px-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />

      <span className="text-sm font-bold text-white/70">{label}</span>
    </label>
  )
}