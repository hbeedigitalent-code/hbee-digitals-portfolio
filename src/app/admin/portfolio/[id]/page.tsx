'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import Link from 'next/link'

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
  // Case study specific fields
  challenge: string
  solution: string
  results: string
  technologies_used: string
  testimonial: string
  seo_title: string
  seo_description: string
  case_study_content: string
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
  challenge: '',
  solution: '',
  results: '',
  technologies_used: '[]',
  testimonial: '',
  seo_title: '',
  seo_description: '',
  case_study_content: '',
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
    throw new Error('Invalid JSON format')
  }
}

export default function EditPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [form, setForm] = useState<PortfolioForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (id) fetchItem()
  }, [id])

  async function fetchItem() {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setForm({
        id: data.id,
        title: data.title || data.client_name || '',
        slug: data.slug || '',
        client_name: data.client_name || data.title || '',
        category: data.category || '',
        project_type: data.project_type || '',
        description: data.description || '',
        image_url: data.image_url || '',
        metric_label: data.metric_label || '',
        metric_value: data.metric_value || '',
        industry: data.industry || '',
        technology: data.technology || '',
        website_url: data.website_url || '',
        brief: data.brief || '',
        results_summary: data.results_summary || '',
        before_image: data.before_image || '',
        after_image: data.after_image || '',
        gallery_images: formatJson(data.gallery_images),
        result_metrics: formatJson(data.result_metrics),
        display_order: data.display_order || 0,
        featured: data.featured || false,
        is_active: data.is_active ?? true,
        is_before_after: data.is_before_after || false,
        challenge: data.challenge || '',
        solution: data.solution || '',
        results: data.results || '',
        technologies_used: formatJson(data.technologies_used),
        testimonial: data.testimonial || '',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
        case_study_content: data.case_study_content || '',
      })
    }
    setLoading(false)
  }

  function updateField<K extends keyof PortfolioForm>(key: K, value: PortfolioForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
        challenge: form.challenge,
        solution: form.solution,
        results: form.results,
        technologies_used: parseJson(form.technologies_used),
        testimonial: form.testimonial,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        case_study_content: form.case_study_content,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('portfolio_items')
        .update(payload)
        .eq('id', id)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setMessage('Portfolio item updated successfully.')
      setTimeout(() => router.push('/admin/portfolio'), 1500)
    } catch (error: any) {
      setErrorMessage(error.message || 'Something went wrong.')
    }

    setSaving(false)
  }

  async function deleteItem() {
    if (!confirm('Delete this portfolio item permanently?')) return

    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.push('/admin/portfolio')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              Admin / Portfolio / Edit
            </p>
            <h1 className="text-4xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
              Edit Portfolio Item
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Update project details, case study content, SEO, and visibility settings.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={deleteItem}
              className="rounded-full border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-black text-red-400 transition hover:bg-red-500/20"
            >
              Delete Item
            </button>
            <Link
              href="/admin/portfolio"
              className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-6 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
            >
              Cancel
            </Link>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-5 py-4 text-sm font-bold text-[var(--accent)]">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">Basic Information</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Project Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Slug *</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => updateField('slug', slugify(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">URL: /portfolio/{form.slug || '...'}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Client Name</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="Fashion, E-commerce, Healthcare"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Project Type</label>
                <input
                  type="text"
                  value={form.project_type}
                  onChange={(e) => updateField('project_type', e.target.value)}
                  placeholder="Shopify Redesign + CRO"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Short Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">Project Images</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <ImageUpload
                label="Main Image"
                currentImage={form.image_url}
                folder="portfolio"
                onUpload={(url) => updateField('image_url', url)}
              />
              <div className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Metric Value</label>
                  <input
                    type="text"
                    value={form.metric_value}
                    onChange={(e) => updateField('metric_value', e.target.value)}
                    placeholder="+38%"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Metric Label</label>
                  <input
                    type="text"
                    value={form.metric_label}
                    onChange={(e) => updateField('metric_label', e.target.value)}
                    placeholder="Conversion Lift"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
          </div>

          {/* Case Study Content Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">Case Study Content</h2>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">The Brief / Challenge</label>
                <textarea
                  rows={6}
                  value={form.brief}
                  onChange={(e) => updateField('brief', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="Describe the problem or challenge the client faced..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">The Solution</label>
                <textarea
                  rows={6}
                  value={form.solution || ''}
                  onChange={(e) => updateField('solution', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="Describe your approach and solution..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Results & Impact</label>
                <textarea
                  rows={6}
                  value={form.results || form.results_summary || ''}
                  onChange={(e) => updateField('results', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="Describe the measurable results and impact..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Client Testimonial</label>
                <textarea
                  rows={4}
                  value={form.testimonial || ''}
                  onChange={(e) => updateField('testimonial', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder='"Client feedback about working with us..."'
                />
              </div>
            </div>
          </div>

          {/* Technologies & Metrics Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">Technologies & Metrics</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Industry</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="E-commerce, Healthcare, Real Estate"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Technology Stack</label>
                <input
                  type="text"
                  value={form.technology}
                  onChange={(e) => updateField('technology', e.target.value)}
                  placeholder="Shopify, React, Supabase, Tailwind"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Technologies Used (JSON)</label>
              <textarea
                rows={4}
                value={form.technologies_used}
                onChange={(e) => updateField('technologies_used', e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                placeholder='["Shopify", "Klaviyo", "Supabase"]'
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Gallery Images (JSON)</label>
              <textarea
                rows={4}
                value={form.gallery_images}
                onChange={(e) => updateField('gallery_images', e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                placeholder='["/image-1.jpg", "/image-2.jpg"]'
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Result Metrics (JSON)</label>
              <textarea
                rows={5}
                value={form.result_metrics}
                onChange={(e) => updateField('result_metrics', e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                placeholder='[{"label":"Conversion Lift","value":"+38%"},{"label":"Speed Score","value":"91"}]'
              />
            </div>
          </div>

          {/* SEO Settings Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">SEO Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">SEO Title</label>
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={(e) => updateField('seo_title', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="Case Study: Client Name | Hbee Digitals"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Recommended: 50-60 characters</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">SEO Description</label>
                <textarea
                  rows={3}
                  value={form.seo_description}
                  onChange={(e) => updateField('seo_description', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="Learn how Hbee Digitals helped Client Name achieve +150% growth through strategic digital transformation..."
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Recommended: 150-160 characters</p>
              </div>
            </div>
          </div>

          {/* Visibility Settings Section */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-5 text-xl font-black text-[var(--text-primary)]">Visibility & Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-secondary)]">Website URL</label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => updateField('website_url', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => updateField('featured', e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Featured on Homepage</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Active / Visible</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <input
                  type="checkbox"
                  checked={form.is_before_after}
                  onChange={(e) => updateField('is_before_after', e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)]">Show in Before/After</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pb-10">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Portfolio Item'}
            </button>
            <Link
              href="/admin/portfolio"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-8 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}