'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'

interface Testimonial {
  id: string
  name: string
  position?: string
  role?: string
  company?: string
  content: string
  rating: number
  image_url?: string
  display_order: number
  is_active: boolean
  created_at: string
}

const blockedNames = [
  'john doe',
  'jane smith',
  'mike johnson',
  'test user',
  'demo user',
  'sample user',
  'lorem ipsum',
]

const defaultForm = {
  name: '',
  position: '',
  company: '',
  content: '',
  rating: 5,
  image_url: '',
  display_order: 0,
  is_active: false,
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  async function fetchTestimonials() {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })

    setTestimonials(data || [])
    setLoading(false)
  }

  function resetForm() {
    setFormData(defaultForm)
    setEditingItem(null)
    setShowForm(false)
  }

  function validateForm() {
    const name = formData.name.trim().toLowerCase()
    const content = formData.content.trim()

    if (blockedNames.includes(name)) {
      return 'Placeholder testimonial names are not allowed.'
    }

    if (content.length < 35) {
      return 'Testimonial content is too short. Add real, useful client feedback.'
    }

    if (!formData.company.trim()) {
      return 'Please add the client company or brand name for credibility.'
    }

    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const validationError = validateForm()

    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      setSaving(false)
      return
    }

    const payload = {
      name: formData.name.trim(),
      position: formData.position.trim(),
      role: formData.position.trim(),
      company: formData.company.trim(),
      content: formData.content.trim(),
      rating: Number(formData.rating),
      image_url: formData.image_url,
      display_order: Number(formData.display_order),
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingItem) {
      const { error } = await supabase
        .from('testimonials')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Testimonial updated successfully.' })
        await fetchTestimonials()
        resetForm()
      }
    } else {
      const { error } = await supabase.from('testimonials').insert([payload])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Testimonial created successfully.' })
        await fetchTestimonials()
        resetForm()
      }
    }

    setSaving(false)
  }

  function handleEdit(item: Testimonial) {
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      position: item.position || item.role || '',
      company: item.company || '',
      content: item.content || '',
      rating: item.rating || 5,
      image_url: item.image_url || '',
      display_order: item.display_order || 0,
      is_active: item.is_active || false,
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimonial?')) return

    const { error } = await supabase.from('testimonials').delete().eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Testimonial deleted successfully.' })
      await fetchTestimonials()
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('testimonials')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      await fetchTestimonials()
      setMessage({
        type: 'success',
        text: `Testimonial ${!currentStatus ? 'activated' : 'deactivated'}.`,
      })
      setTimeout(() => setMessage(null), 2200)
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        <p className="mt-2 text-gray-600">Loading testimonials...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Testimonials</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage only real, verified client testimonials displayed on the website.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg px-4 py-2 text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + New Testimonial
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
            {editingItem ? 'Edit Testimonial' : 'Add New Testimonial'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Use only real testimonials. Placeholder names like John Doe, Jane Smith, or
              demo content will be rejected.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Client Name *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                placeholder="Client full name or verified brand contact"
                required
              />

              <Input
                label="Position / Role"
                value={formData.position}
                onChange={(value) =>
                  setFormData({ ...formData, position: value })
                }
                placeholder="Founder, Store Owner, CEO"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company / Brand *"
                value={formData.company}
                onChange={(value) =>
                  setFormData({ ...formData, company: value })
                }
                placeholder="Company or brand name"
                required
              />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Rating
                </label>

                <select
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rating: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>★★★★★ (5)</option>
                  <option value={4}>★★★★☆ (4)</option>
                  <option value={3}>★★★☆☆ (3)</option>
                  <option value={2}>★★☆☆☆ (2)</option>
                  <option value={1}>★☆☆☆☆ (1)</option>
                </select>
              </div>
            </div>

            <ImageUpload
              onUpload={(url) => setFormData({ ...formData, image_url: url })}
              currentImage={formData.image_url}
              folder="testimonials"
              label="Client Avatar / Brand Representative"
            />

            <div>
              <label className="mb-1 block text-sm font-medium">
                Testimonial Content *
              </label>

              <textarea
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={5}
                className="w-full rounded-lg border p-2 leading-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the real client feedback here."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Display Order"
                type="number"
                value={String(formData.display_order)}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(value || '0', 10),
                  })
                }
                placeholder="0, 1, 2..."
              />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Status
                </label>

                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.value === 'active',
                    })
                  }
                  className="w-full rounded-lg border p-2"
                >
                  <option value="inactive">Inactive / Draft</option>
                  <option value="active">Active / Public</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving
                  ? 'Saving...'
                  : editingItem
                    ? 'Update Testimonial'
                    : 'Create Testimonial'}
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

      <div className="grid gap-4">
        {testimonials.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mb-4 text-6xl">⭐</div>
            <p className="text-gray-500">
              No testimonials yet. Add only real client feedback when available.
            </p>
          </div>
        ) : (
          testimonials.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 gap-4">
                  {item.image_url && (
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
                        {item.name}
                      </h3>

                      {(item.position || item.role) && (
                        <span className="text-sm text-gray-500">
                          {item.position || item.role}
                        </span>
                      )}

                      {item.company && (
                        <span className="text-sm text-gray-400">
                          at {item.company}
                        </span>
                      )}
                    </div>

                    {renderStars(item.rating)}

                    <p className="mt-2 text-gray-600 italic">
                      “{item.content}”
                    </p>

                    <div className="mt-3 flex gap-4 text-sm text-gray-400">
                      <span>Order: {item.display_order}</span>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : 'No date'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => toggleStatus(item.id, item.is_active)}
                    className={`rounded px-2 py-1 text-xs ${
                      item.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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