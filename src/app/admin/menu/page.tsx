'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface MenuItem {
  id: string
  label: string
  href: string
  display_order: number
  is_active: boolean
}

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [message, setMessage] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formHref, setFormHref] = useState('')
  const [formOrder, setFormOrder] = useState(0)

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true })
    setMenuItems(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setEditingItem(null)
    setFormLabel('')
    setFormHref('')
    setFormOrder(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formLabel.trim() || !formHref.trim()) {
      setMessage('Label and URL are required.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    const newItem = {
      label: formLabel.trim(),
      href: formHref.trim(),
      display_order: formOrder,
      is_active: true
    }

    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update(newItem)
        .eq('id', editingItem.id)
      if (error) setMessage(`Error: ${error.message}`)
      else setMessage('Menu item updated!')
    } else {
      const { error } = await supabase
        .from('menu_items')
        .insert([newItem])
      if (error) setMessage(`Error: ${error.message}`)
      else setMessage('Menu item added!')
    }

    resetForm()
    fetchMenuItems()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormLabel(item.label)
    setFormHref(item.href)
    setFormOrder(item.display_order)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Menu item deleted!')
    fetchMenuItems()
    setTimeout(() => setMessage(''), 3000)
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('menu_items').update({ is_active: !currentStatus }).eq('id', id)
    fetchMenuItems()
  }

  const cancelEdit = () => {
    resetForm()
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
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Menu Management</h2>
        <p className="text-sm text-[var(--text-secondary)]">Control your website navigation menu items.</p>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Label *</label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                placeholder="Home, About, Services"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">URL / Link *</label>
              <input
                type="text"
                value={formHref}
                onChange={(e) => setFormHref(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                placeholder="/, /about, /services"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Display Order</label>
              <input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]">
                {editingItem ? 'Update' : 'Add'} Menu Item
              </button>
              {editingItem && (
                <button type="button" onClick={cancelEdit} className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black text-[var(--text-muted)]">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Current Menu Items</h3>
          {menuItems.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-muted)]">No menu items yet.</p>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="font-bold text-[var(--text-primary)]">{item.label}</span>
                      <span className="text-sm text-[var(--text-muted)]">→</span>
                      <span className="text-sm text-[var(--text-muted)]">{item.href}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Order: {item.display_order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleStatus(item.id, item.is_active)} className={`rounded-lg px-2 py-1 text-xs font-bold ${item.is_active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                      {item.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => handleEdit(item)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-section)]">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Live Preview</h3>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
          <div className="flex flex-wrap gap-4">
            {menuItems.filter(item => item.is_active).map((item) => (
              <a key={item.id} href={item.href} className="text-sm font-bold text-[var(--accent)] hover:underline">
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">This is how your navigation menu will appear on the website.</p>
      </div>
    </div>
  )
}