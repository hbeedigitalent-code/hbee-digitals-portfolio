'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

interface PortfolioItem {
  id: string
  name?: string
  title?: string
  slug?: string
  client_name?: string
  category?: string
  industry?: string
  result?: string
  results?: string[] | string
  image_url?: string
  featured_image?: string
  gallery?: string[] | string
  tag?: string
  featured?: boolean
  url?: string
  live_url?: string
  project_url?: string
  description?: string
  challenge?: string
  solution?: string
  process?: string[] | string
  technologies?: string[] | string
  testimonial?: string
  display_order?: number
  is_active?: boolean
  created_at?: string
}

const defaultForm = {
  name: '',
  slug: '',
  client_name: '',
  category: 'food',
  industry: '',
  result: '',
  results: '',
  image_url: '',
  featured_image: '',
  gallery: '',
  tag: '',
  featured: false,
  url: '',
  live_url: '',
  description: '',
  challenge: '',
  solution: '',
  process: '',
  technologies: '',
  testimonial: '',
  display_order: 0,
  is_active: true,
}

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

export default function AdminPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const router = useRouter()

  const categories = [
    { id: 'logos', label: 'Logos' },
    { id: 'clothing-fashion', label: 'Clothing / Fashion' },
    { id: 'kids-clothing', label: 'Kids Clothing' },
    { id: 'jewellery', label: 'Jewellery' },
    { id: 'food', label: 'Food' },
    { id: 'tea-coffee', label: 'Tea / Coffee' },
    { id: 'skin-care', label: 'Skin Care' },
    { id: 'health-care', label: 'Health Care' },
    { id: 'sports-fitness', label: 'Sports / Fitness' },
    { id: 'pets', label: 'Pets' },
    { id: 'ecommerce', label: 'Ecommerce' },
    { id: 'web-design', label: 'Web Design' },
    { id: 'branding', label: 'Branding' },
  ]

  useEffect(() => {
    checkAuth()
    fetchItems()
  }, [])

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) router.push('/admin/login')
  }

  async function fetchItems() {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('display_order', { ascending: true })

    setItems(data || [])
    setLoading(false)
  }

  function resetForm() {
    setFormData(defaultForm)
    setEditingItem(null)
    setShowForm(false)
  }

  function updateField(field: keyof typeof defaultForm, value: any) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Project name is required.' })
      setSaving(false)
      return
    }

    if (formData.description.trim().length < 30) {
      setMessage({
        type: 'error',
        text: 'Description should be more detailed for credibility.',
      })
      setSaving(false)
      return
    }

    const finalSlug = formData.slug.trim() || createSlug(formData.name)

    const payload = {
      name: formData.name.trim(),
      title: formData.name.trim(),
      slug: finalSlug,
      client_name: formData.client_name.trim(),
      category: formData.category,
      industry: formData.industry.trim(),
      result: formData.result.trim(),
      results: toArray(formData.results),
      image_url: formData.image_url,
      featured_image: formData.featured_image || formData.image_url,
      gallery: toArray(formData.gallery),
      tag: formData.tag.trim(),
      featured: formData.featured,
      url: formData.url.trim(),
      live_url: formData.live_url.trim() || formData.url.trim(),
      project_url: formData.live_url.trim() || formData.url.trim(),
      description: formData.description.trim(),
      challenge: formData.challenge.trim(),
      solution: formData.solution.trim(),
      process: toArray(formData.process),
      technologies: toArray(formData.technologies),
      testimonial: formData.testimonial.trim(),
      display_order: formData.display_order,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingItem) {
      const { error } = await supabase
        .from('portfolio_items')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({
          type: 'success',
          text: 'Portfolio case study updated successfully.',
        })
        await fetchItems()
        resetForm()
      }
    } else {
      const { error } = await supabase.from('portfolio_items').insert([payload])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({
          type: 'success',
          text: 'Portfolio case study created successfully.',
        })
        await fetchItems()
        resetForm()
      }
    }

    setSaving(false)
  }

  function handleEdit(item: PortfolioItem) {
    setEditingItem(item)

    setFormData({
      name: item.name || item.title || '',
      slug: item.slug || createSlug(item.name || item.title || ''),
      client_name: item.client_name || '',
      category: item.category || 'food',
      industry: item.industry || '',
      result: item.result || '',
      results: arrayToText(item.results),
      image_url: item.image_url || '',
      featured_image: item.featured_image || item.image_url || '',
      gallery: arrayToText(item.gallery),
      tag: item.tag || '',
      featured: item.featured || false,
      url: item.url || item.project_url || '',
      live_url: item.live_url || item.url || item.project_url || '',
      description: item.description || '',
      challenge: item.challenge || '',
      solution: item.solution || '',
      process: arrayToText(item.process),
      technologies: arrayToText(item.technologies),
      testimonial: item.testimonial || '',
      display_order: item.display_order || 0,
      is_active: item.is_active !== false,
    })

    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this portfolio item?')) return

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Portfolio item deleted successfully.',
      })
      await fetchItems()
    }
  }

  async function toggleStatus(id: string, currentStatus?: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      await fetchItems()
    }
  }

  async function toggleFeatured(id: string, currentStatus?: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ featured: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      await fetchItems()
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        <p className="mt-2 text-gray-600">Loading portfolio items...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Portfolio Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage portfolio projects and full case study content from one place.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-fit rounded-lg px-4 py-2 text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + Add Project
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-100 text-green-700'
              : 'border-red-200 bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            {editingItem ? 'Edit Portfolio Case Study' : 'Add New Portfolio Case Study'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AdminNote />

            <FormSection title="Basic Project Information">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Project Name *"
                  value={formData.name}
                  onChange={(value) => {
                    updateField('name', value)
                    if (!formData.slug) updateField('slug', createSlug(value))
                  }}
                  placeholder="Example: Sobrii Shopify Redesign"
                  required
                />

                <Input
                  label="Slug"
                  value={formData.slug}
                  onChange={(value) => updateField('slug', createSlug(value))}
                  placeholder="sobrii-shopify-redesign"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Client Name"
                  value={formData.client_name}
                  onChange={(value) => updateField('client_name', value)}
                  placeholder="Client or brand name"
                />

                <Input
                  label="Industry"
                  value={formData.industry}
                  onChange={(value) => updateField('industry', value)}
                  placeholder="Food & Beverage, Fashion, Ecommerce..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Tag"
                  value={formData.tag}
                  onChange={(value) => updateField('tag', value)}
                  placeholder="Shopify Redesign, Branding, UX Optimization"
                />
              </div>

              <Textarea
                label="Short Description *"
                value={formData.description}
                onChange={(value) => updateField('description', value)}
                rows={4}
                placeholder="Explain the project and the transformation clearly."
                required
              />
            </FormSection>

            <FormSection title="Images">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                Recommended image size: 1600 × 1200px for portfolio cards. Keep
                important content centered. Crop feature can be added later with a
                dedicated crop modal.
              </div>

              <ImageUpload
                onUpload={(url) =>
                  setFormData({
                    ...formData,
                    image_url: url,
                    featured_image: formData.featured_image || url,
                  })
                }
                currentImage={formData.image_url}
                folder="portfolio"
                label="Main Project Image"
              />

              <ImageUpload
                onUpload={(url) =>
                  setFormData({
                    ...formData,
                    featured_image: url,
                  })
                }
                currentImage={formData.featured_image}
                folder="portfolio"
                label="Featured / Hero Image"
              />

              <Textarea
                label="Gallery Image URLs"
                value={formData.gallery}
                onChange={(value) => updateField('gallery', value)}
                rows={4}
                placeholder={'One image URL per line\nhttps://...\nhttps://...'}
              />
            </FormSection>

            <FormSection title="Case Study Story">
              <Textarea
                label="Challenge"
                value={formData.challenge}
                onChange={(value) => updateField('challenge', value)}
                rows={5}
                placeholder="What problem did the client have before the project?"
              />

              <Textarea
                label="Solution"
                value={formData.solution}
                onChange={(value) => updateField('solution', value)}
                rows={5}
                placeholder="What did Hbee Digitals improve, design, build, or optimize?"
              />

              <Textarea
                label="Process Steps"
                value={formData.process}
                onChange={(value) => updateField('process', value)}
                rows={5}
                placeholder={'One per line\nAudit and UX review\nBrand direction refinement\nResponsive development'}
              />
            </FormSection>

            <FormSection title="Results & Proof">
              <Input
                label="Main Result Metric"
                value={formData.result}
                onChange={(value) => updateField('result', value)}
                placeholder="+38% conversion lift, Faster checkout flow..."
              />

              <Textarea
                label="Detailed Results"
                value={formData.results}
                onChange={(value) => updateField('results', value)}
                rows={5}
                placeholder={'One per line\nImproved product discovery\nCleaner mobile customer journey\nStronger brand trust'}
              />

              <Textarea
                label="Technologies Used"
                value={formData.technologies}
                onChange={(value) => updateField('technologies', value)}
                rows={4}
                placeholder={'One per line\nShopify\nNext.js\nSupabase\nTailwind CSS'}
              />

              <Textarea
                label="Client Testimonial"
                value={formData.testimonial}
                onChange={(value) => updateField('testimonial', value)}
                rows={4}
                placeholder="Only add real feedback. Leave empty if not available."
              />
            </FormSection>

            <FormSection title="Links & Visibility">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Project URL"
                  value={formData.url}
                  onChange={(value) => updateField('url', value)}
                  placeholder="https://clientwebsite.com"
                />

                <Input
                  label="Live URL"
                  value={formData.live_url}
                  onChange={(value) => updateField('live_url', value)}
                  placeholder="https://clientwebsite.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Display Order"
                  type="number"
                  value={String(formData.display_order)}
                  onChange={(value) =>
                    updateField('display_order', parseInt(value || '0', 10))
                  }
                />

                <div className="flex flex-col gap-3 pt-7">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => updateField('featured', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">Featured on Homepage</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => updateField('is_active', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">Active / visible on website</span>
                  </label>
                </div>
              </div>
            </FormSection>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving
                  ? 'Saving...'
                  : editingItem
                    ? 'Update Case Study'
                    : 'Create Case Study'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4 text-6xl">📁</div>
            <p className="text-gray-500">
              No portfolio items yet. Click “Add Project” to create your first one.
            </p>
          </div>
        ) : (
          <div className="grid gap-0 divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 p-5 transition hover:bg-gray-50 md:grid-cols-[80px_1fr_auto]"
              >
                <div>
                  {item.image_url || item.featured_image ? (
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={item.featured_image || item.image_url || ''}
                        alt={item.name || item.title || 'Portfolio item'}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
                      <span className="text-xl">📷</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {item.name || item.title}
                    </h3>

                    {item.featured && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                        Featured
                      </span>
                    )}

                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        item.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-gray-600">
                    {item.description || 'No description added.'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>Category: {item.category}</span>
                    <span>Slug: /portfolio/{item.slug || createSlug(item.name || item.title || '')}</span>
                    <span>Order: {item.display_order || 0}</span>
                    {item.result && <span>Result: {item.result}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2 md:justify-end">
                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleFeatured(item.id, item.featured)}
                    className="rounded bg-yellow-100 px-3 py-1 text-sm text-yellow-700 hover:bg-yellow-200"
                  >
                    {item.featured ? 'Unfeature' : 'Feature'}
                  </button>

                  <button
                    onClick={() => toggleStatus(item.id, item.is_active)}
                    className="rounded bg-orange-100 px-3 py-1 text-sm text-orange-700 hover:bg-orange-200"
                  >
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-blue-800">
          📁 About Portfolio Management
        </h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Use 1600 × 1200px images for clean portfolio card cropping.</li>
          <li>• Add challenge, solution, process, and results to create real case studies.</li>
          <li>• Featured projects appear on the homepage portfolio section.</li>
          <li>• Active projects appear on the public website.</li>
          <li>• Gallery images can be added as one URL per line.</li>
        </ul>
      </div>
    </div>
  )
}

function AdminNote() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
      Case studies build trust. Avoid placeholder content. Use real project
      challenges, process details, and results whenever available.
    </div>
  )
}

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
        {title}
      </h4>

      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Input({
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
      <label className="mb-1 block text-sm font-medium">{label}</label>

      <input
        type={type}
        required={required}
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
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>

      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border p-2 leading-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  )
}