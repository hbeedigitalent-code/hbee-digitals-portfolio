'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  is_before_after: boolean  // ← ADD THIS LINE
  display_order: number
  created_at: string
}

export default function AdminBeforeAfterPage() {
  const router = useRouter()
  const [items, setItems] = useState<BeforeAfterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<string>('all')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_before_after', true)
      .order('display_order', { ascending: true })

    if (!error && data) {
      setItems(data)
    }
    setLoading(false)
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (!error) {
      setItems(items.map(item => 
        item.id === id ? { ...item, is_active: !currentStatus } : item
      ))
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this transformation?')) return

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id)

    if (!error) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && item.is_active) ||
                         (filterActive === 'inactive' && !item.is_active)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Before & After Transformations</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage transformations displayed on the Before/After page
          </p>
        </div>
        <Link
          href="/admin/before-after/new"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--orange-600)]"
        >
          <SvgIcon name="plus" size={16} color="white" />
          New Transformation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-3 text-center">
          <div className="text-xl font-bold text-white">{items.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Total</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent-lime)]">{items.filter(i => i.is_active).length}</div>
          <div className="text-xs text-[var(--text-muted)]">Active</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent-orange)]">{items.filter(i => i.is_before_after).length}</div>
          <div className="text-xs text-[var(--text-muted)]">Before/After</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-3 text-center">
          <div className="text-xl font-bold text-blue-400">{items.filter(i => i.metric_value).length}</div>
          <div className="text-xs text-[var(--text-muted)]">With Metrics</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, client, or category..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => {
            setSearchTerm('')
            setFilterActive('all')
          }}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card-dark)] transition"
        >
          Clear
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SvgIcon name="image" size={48} color="var(--text-muted)" />
            <h3 className="mt-4 text-lg font-semibold text-white">No transformations found</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {items.length === 0 ? 'Add your first before/after transformation!' : 'Try adjusting your filters'}
            </p>
            {items.length === 0 && (
              <Link
                href="/admin/before-after/new"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--orange-600)]"
              >
                <SvgIcon name="plus" size={16} color="white" />
                Create First Transformation
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Title / Client</th>
                  <th className="px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Metric</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-section)] transition">
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{item.title || item.client_name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{item.client_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-[var(--text-muted)]">{item.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {item.metric_value ? (
                        <span className="text-sm font-semibold text-[var(--accent-orange)]">
                          {item.metric_value} {item.metric_label || ''}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(item.id, item.is_active)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          item.is_active
                            ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)] hover:bg-[var(--accent-lime)]/30'
                            : 'bg-[var(--text-muted)]/20 text-[var(--text-muted)] hover:bg-[var(--text-muted)]/30'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/before-after/${item.id}`}
                          className="rounded-lg px-3 py-1.5 text-sm text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10 transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}