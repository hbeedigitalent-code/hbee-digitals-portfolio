'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BulkDeleteEnhanced from '@/components/BulkDeleteEnhanced'

interface Service {
  id: string
  title?: string
  slug?: string
  description?: string
  short_description?: string
  full_description?: string
  icon?: string
  features?: string[] | string
  benefits?: string[] | string
  deliverables?: string[] | string
  timeline?: string
  starting_price?: string
  display_order?: number
  is_active?: boolean
  is_featured?: boolean
}

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

export default function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/admin/login')
      } else {
        fetchServices()
      }
    }

    checkUser()
  }, [router])

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true })

    setServices(data || [])
    setLoading(false)
  }

  async function toggleStatus(id: string, currentStatus?: boolean) {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      await fetchServices()
      setMessage(`Service ${!currentStatus ? 'activated' : 'deactivated'} successfully.`)
    }
  }

  async function toggleFeatured(id: string, currentStatus?: boolean) {
    const { error } = await supabase
      .from('services')
      .update({ is_featured: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      await fetchServices()
      setMessage(`Service ${!currentStatus ? 'marked as featured' : 'removed from featured'} successfully.`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this service?')) return

    const { error } = await supabase.from('services').delete().eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      await fetchServices()
      setMessage('Service deleted successfully.')
    }
  }

  function handleToggleSelect(id: string, checked: boolean) {
    const event = new CustomEvent('toggleSelect', { detail: { id, checked } })
    document.dispatchEvent(event)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Manage Services</h1>

          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">All Services</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage service depth, icons, pricing notes, features, benefits, and deliverables.
            </p>
          </div>

          <Link
            href="/admin/services/new"
            className="w-fit rounded-lg px-4 py-2 text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + Add New Service
          </Link>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-100 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {services.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">
              No services yet. Click “Add New Service” to create one.
            </p>
          </div>
        ) : (
          <>
            <BulkDeleteEnhanced
              table="services"
              items={services}
              onDelete={fetchServices}
              itemName="services"
            />

            <div className="grid gap-4">
              {services.map((service) => {
                const features = normalizeArray(service.features)
                const benefits = normalizeArray(service.benefits)
                const deliverables = normalizeArray(service.deliverables)

                return (
                  <div
                    key={service.id}
                    className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <input
                            type="checkbox"
                            data-id={service.id}
                            className="select-checkbox h-4 w-4 cursor-pointer"
                            onChange={(e) =>
                              handleToggleSelect(service.id, e.target.checked)
                            }
                          />

                          <h3 className="text-lg font-semibold text-gray-800">
                            {service.title || 'Untitled Service'}
                          </h3>

                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              service.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>

                          {service.is_featured && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                              Featured
                            </span>
                          )}

                          <span className="text-sm text-gray-400">
                            Order: {service.display_order || 0}
                          </span>

                          {service.icon && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                              Icon: {service.icon}
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-2 text-sm leading-6 text-gray-600">
                          {service.short_description ||
                            service.description ||
                            'No description added yet.'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {service.slug && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                              /services/{service.slug}
                            </span>
                          )}

                          {service.timeline && (
                            <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700">
                              {service.timeline}
                            </span>
                          )}

                          {service.starting_price && (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                              {service.starting_price}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <MiniList title="Features" items={features} />
                          <MiniList title="Benefits" items={benefits} />
                          <MiniList title="Deliverables" items={deliverables} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          onClick={() => toggleStatus(service.id, service.is_active)}
                          className={`rounded px-3 py-1 text-sm ${
                            service.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() =>
                            toggleFeatured(service.id, service.is_featured)
                          }
                          className={`rounded px-3 py-1 text-sm ${
                            service.is_featured
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {service.is_featured ? 'Unfeature' : 'Feature'}
                        </button>

                        <Link
                          href={`/admin/services/${service.id}`}
                          className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => handleDelete(service.id)}
                          className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>

      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 4).map((item) => (
            <span key={item} className="rounded bg-white px-2 py-1 text-xs text-gray-600">
              {item}
            </span>
          ))}

          {items.length > 4 && (
            <span className="rounded bg-white px-2 py-1 text-xs text-gray-400">
              +{items.length - 4} more
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Not added yet</p>
      )}
    </div>
  )
}