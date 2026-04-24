'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/admin/login')
      else fetchMenuItems()
    }
    checkUser()
  }, [])

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true })
    setMenuItems(data || [])
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const newItem = {
      label: formData.get('label'),
      href: formData.get('href'),
      display_order: parseInt(formData.get('display_order') as string) || 0,
      is_active: true
    }

    if (editingItem) {
      await supabase.from('menu_items').update(newItem).eq('id', editingItem.id)
    } else {
      await supabase.from('menu_items').insert([newItem])
    }
    
    setEditingItem(null)
    form.reset()
    fetchMenuItems()
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    // Populate form
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      ;(form.querySelector('[name="label"]') as HTMLInputElement).value = item.label
      ;(form.querySelector('[name="href"]') as HTMLInputElement).value = item.href
      ;(form.querySelector('[name="display_order"]') as HTMLInputElement).value = item.display_order
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this menu item?')) {
      await supabase.from('menu_items').delete().eq('id', id)
      fetchMenuItems()
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('menu_items').update({ is_active: !currentStatus }).eq('id', id)
    fetchMenuItems()
  }

  const cancelEdit = () => {
    setEditingItem(null)
    const form = document.querySelector('form') as HTMLFormElement
    if (form) form.reset()
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Menu Management</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Add/Edit Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Label *</label>
                <input
                  type="text"
                  name="label"
                  required
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Home, About, Contact"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">URL / Link *</label>
                <input
                  type="text"
                  name="href"
                  required
                  className="w-full p-2 border rounded"
                  placeholder="e.g., /, /about, /contact"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  name="display_order"
                  defaultValue="0"
                  className="w-full p-2 border rounded"
                  placeholder="0, 1, 2, 3..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingItem ? 'Update' : 'Add'} Menu Item
                </button>
                {editingItem && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu Items List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Current Menu Items</h2>
              <p className="text-sm text-gray-500">Drag to reorder (coming soon)</p>
            </div>
            
            <div className="divide-y">
              {menuItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No menu items yet. Add your first one!
                </div>
              ) : (
                menuItems.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-gray-400 text-sm">→</span>
                        <span className="text-gray-600 text-sm">{item.href}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Order: {item.display_order}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatus(item.id, item.is_active)}
                        className={`px-2 py-1 text-xs rounded ${
                          item.is_active 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {item.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Live Preview</h2>
          <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
            <div className="flex gap-6">
              {menuItems.filter(item => item.is_active).map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="text-white hover:opacity-80 transition"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            This is how your menu will appear on the website.
          </p>
        </div>
      </div>
    </div>
  )
}