'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface MenuItem {
  id: string
  label: string
  href: string
  icon: string
  parent_id: string | null
  display_order: number
  is_active: boolean
  is_mobile_visible: boolean
  is_desktop_visible: boolean
  opens_new_tab: boolean
}

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    label: '',
    href: '',
    icon: 'link',
    parent_id: '',
    display_order: 0,
    is_active: true,
    is_mobile_visible: true,
    is_desktop_visible: true,
    opens_new_tab: false,
  })

  useEffect(() => {
    fetchMenuItems()
  }, [])

  async function fetchMenuItems() {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true })

    setMenuItems(data || [])
    setLoading(false)
  }

  function resetForm() {
    setFormData({
      label: '',
      href: '',
      icon: 'link',
      parent_id: '',
      display_order: menuItems.length,
      is_active: true,
      is_mobile_visible: true,
      is_desktop_visible: true,
      opens_new_tab: false,
    })
    setEditingItem(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!formData.label.trim() || !formData.href.trim()) {
      setMessage({ type: 'error', text: 'Label and URL are required.' })
      setSaving(false)
      return
    }

    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update({
          label: formData.label.trim(),
          href: formData.href.trim(),
          icon: formData.icon,
          parent_id: formData.parent_id || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
          is_mobile_visible: formData.is_mobile_visible,
          is_desktop_visible: formData.is_desktop_visible,
          opens_new_tab: formData.opens_new_tab,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Menu item updated!' })
        fetchMenuItems()
        resetForm()
      }
    } else {
      const { error } = await supabase.from('menu_items').insert([{
        label: formData.label.trim(),
        href: formData.href.trim(),
        icon: formData.icon,
        parent_id: formData.parent_id || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
        is_mobile_visible: formData.is_mobile_visible,
        is_desktop_visible: formData.is_desktop_visible,
        opens_new_tab: formData.opens_new_tab,
      }])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Menu item created!' })
        fetchMenuItems()
        resetForm()
      }
    }

    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  function handleEdit(item: MenuItem) {
    setEditingItem(item)
    setFormData({
      label: item.label,
      href: item.href,
      icon: item.icon || 'link',
      parent_id: item.parent_id || '',
      display_order: item.display_order,
      is_active: item.is_active,
      is_mobile_visible: item.is_mobile_visible,
      is_desktop_visible: item.is_desktop_visible,
      opens_new_tab: item.opens_new_tab,
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this menu item? Children will become top-level items.')) return

    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Menu item deleted!' })
      fetchMenuItems()
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function toggleStatus(id: string, current: boolean) {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: !current })
      .eq('id', id)

    if (!error) fetchMenuItems()
  }

  async function updateOrder(id: string, newOrder: number) {
    const { error } = await supabase
      .from('menu_items')
      .update({ display_order: newOrder })
      .eq('id', id)

    if (!error) fetchMenuItems()
  }

  const iconOptions = [
    'home', 'about', 'services', 'portfolio', 'blog', 'contact', 
    'pricing', 'faq', 'link', 'external', 'arrow-right', 'chevron-right'
  ]

  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Navigation Menu</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage your website navigation links</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-5 py-2.5 text-sm font-black text-white transition hover:scale-105"
          >
            <SvgIcon name="plus" size={16} color="white" />
            Add Menu Item
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add/Edit Form */}
        {showForm && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">
              {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  placeholder="Home, About, Services"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">URL / Link *</label>
                <input
                  type="text"
                  value={formData.href}
                  onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  placeholder="/, /about, /services"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Parent Item</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  >
                    <option value="">None (Top Level)</option>
                    {menuItems.filter(item => !item.parent_id && item.id !== editingItem?.id).map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm">Active on website</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.opens_new_tab}
                      onChange={(e) => setFormData({ ...formData, opens_new_tab: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm">Open in new tab</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gradient-orange-green px-6 py-2 text-sm font-black text-white transition hover:scale-105 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black text-[var(--text-muted)] hover:bg-[var(--bg-section)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Menu Items List */}
        <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 ${!showForm ? 'lg:col-span-2' : ''}`}>
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Current Menu Items</h3>
          
          {menuItems.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-muted)]">No menu items yet. Click "Add Menu Item" to create one.</p>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-[var(--border)] p-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="font-bold text-[var(--text-primary)]">{item.label}</span>
                      <span className="text-sm text-[var(--text-muted)] hidden sm:inline">→</span>
                      <span className="text-sm text-[var(--text-muted)] break-all">{item.href}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                      <span>Order: {item.display_order}</span>
                      {item.icon !== 'link' && <span>Icon: {item.icon}</span>}
                      {item.parent_id && <span>Parent ID: {item.parent_id.slice(0, 8)}...</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateOrder(item.id, item.display_order - 1)}
                        disabled={index === 0}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => updateOrder(item.id, item.display_order + 1)}
                        disabled={index === menuItems.length - 1}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => toggleStatus(item.id, item.is_active)} 
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${item.is_active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}
                    >
                      {item.is_active ? 'Hide' : 'Show'}
                    </button>
                    
                    <button 
                      onClick={() => handleEdit(item)} 
                      className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-section)]"
                    >
                      Edit
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
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
            {menuItems.filter(item => item.is_active && !item.parent_id).map((item) => (
              <a 
                key={item.id} 
                href={item.href} 
                target={item.opens_new_tab ? '_blank' : '_self'}
                className="flex items-center gap-1 text-sm font-bold text-[var(--accent)] hover:underline transition"
              >
                {item.icon !== 'link' && <SvgIcon name={item.icon} size={14} color="var(--accent)" />}
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">This is how your navigation menu will appear on the website. Only top-level active items are shown.</p>
      </div>
    </div>
  )
}