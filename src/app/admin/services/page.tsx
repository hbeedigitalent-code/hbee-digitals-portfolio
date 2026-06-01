'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Service {
  id: string
  title?: string
  slug?: string
  description?: string
  short_description?: string
  icon?: string
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
      return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

export default function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/admin/login')
      else fetchServices()
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
    if (error) setMessage(`Error: ${error.message}`)
    else { await fetchServices(); setMessage(`Service ${!currentStatus ? 'activated' : 'deactivated'}.`) }
    setTimeout(() => setMessage(''), 3000)
  }

  async function toggleFeatured(id: string, currentStatus?: boolean) {
    const { error } = await supabase
      .from('services')
      .update({ is_featured: !currentStatus })
      .eq('id', id)
    if (error) setMessage(`Error: ${error.message}`)
    else { await fetchServices(); setMessage(`Service ${!currentStatus ? 'featured' : 'unfeatured'}.`) }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) setMessage(`Error: ${error.message}`)
    else { await fetchServices(); setMessage('Service deleted.') }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} service(s)?`)) return
    const { error } = await supabase.from('services').delete().in('id', Array.from(selectedIds))
    if (error) setMessage(`Error: ${error.message}`)
    else { await fetchServices(); setSelectedIds(new Set()); setMessage(`${selectedIds.size} service(s) deleted.`) }
    setTimeout(() => setMessage(''), 3000)
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  function toggleSelectAll() {
    if (selectedIds.size === services.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(services.map(s => s.id)))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">All Services</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage service content, icons, pricing, and visibility.</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-black text-red-400 transition hover:bg-red-500/20"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <Link
            href="/admin/services/new"
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
          >
            + Add New Service
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-3 text-sm font-bold text-[var(--accent)]">
          {message}
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <SvgIcon name="services" size={48} color="var(--text-muted)" />
          <p className="mt-4 text-[var(--text-secondary)]">No services yet. Click "Add New Service" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-section)] p-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <input type="checkbox" checked={selectedIds.size === services.length && services.length > 0} onChange={toggleSelectAll} className="h-4 w-4" />
            <div className="flex-1">Service</div>
            <div className="w-24 text-center">Status</div>
            <div className="w-24 text-center">Featured</div>
            <div className="w-28 text-center">Actions</div>
          </div>

          {services.map((service) => (
            <div key={service.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 transition hover:bg-[var(--bg-card-hover)]">
              <input type="checkbox" checked={selectedIds.has(service.id)} onChange={() => toggleSelect(service.id)} className="h-4 w-4" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                    <SvgIcon name={service.icon || 'services'} size={14} color="var(--accent)" />
                  </span>
                  <span className="font-bold text-[var(--text-primary)] truncate">{service.title || 'Untitled'}</span>
                  {service.starting_price && <span className="text-xs text-[var(--text-muted)]">{service.starting_price}</span>}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">{service.short_description || 'No description'}</p>
              </div>

              <div className="w-24 text-center">
                <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${service.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {service.is_active ? 'Active' : 'Draft'}
                </span>
              </div>

              <div className="w-24 text-center">
                {service.is_featured ? (
                  <span className="inline-block rounded-full bg-[var(--accent)]/20 px-2 py-1 text-[10px] font-bold text-[var(--accent)]">Featured</span>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)]">—</span>
                )}
              </div>

              <div className="flex w-28 items-center justify-center gap-2">
                <button onClick={() => toggleStatus(service.id, service.is_active)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs transition hover:border-[var(--accent)]/25">
                  {service.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => toggleFeatured(service.id, service.is_featured)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs transition hover:border-[var(--accent)]/25">
                  {service.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <Link href={`/admin/services/${service.id}`} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--accent)] transition hover:border-[var(--accent)]/25">
                  Edit
                </Link>
                <button onClick={() => handleDelete(service.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10">
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}