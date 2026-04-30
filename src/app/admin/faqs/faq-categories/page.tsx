'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  display_order: number
  is_active: boolean
}

export default function FAQCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: 0,
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCategories()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('faq_categories')
      .select('*')
      .order('display_order', { ascending: true })
    
    setCategories(data || [])
    setLoading(false)
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      display_order: 0,
      is_active: true
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (editingItem) {
      const { error } = await supabase
        .from('faq_categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Category updated successfully!' })
        fetchCategories()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('faq_categories')
        .insert([{
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active
        }])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Category created successfully!' })
        fetchCategories()
        resetForm()
      }
    }
    setSaving(false)
  }

  const handleEdit = (item: Category) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      display_order: item.display_order,
      is_active: item.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category? FAQs in this category will become uncategorized.')) {
      const { error } = await supabase
        .from('faq_categories')
        .delete()
        .eq('id', id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Category deleted successfully!' })
        fetchCategories()
      }
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('faq_categories')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      fetchCategories()
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading categories...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">FAQ Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Manage categories for FAQs (slugs create SEO-friendly URLs)</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + Add Category
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit Category' : 'Add New Category'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setFormData({
                    ...formData,
                    name,
                    slug: generateSlug(name)
                  })
                }}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g., General, Services, Pricing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL)</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                className="w-full p-2 border rounded-lg bg-gray-50"
                placeholder="auto-generated-from-name"
              />
              <p className="text-xs text-gray-400 mt-1">URL: /faq/category/{formData.slug || '...'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Brief description of this category..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0, 1, 2..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : (editingItem ? 'Update Category' : 'Create Category')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-500">No categories yet. Create your first category!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Slug</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Order</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{cat.name}</td>
                    <td className="p-4 text-sm font-mono text-gray-500">{cat.slug}</td>
                    <td className="p-4 text-sm text-gray-500">{cat.display_order}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(cat.id, cat.is_active)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cat.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
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

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">🔗 About Slugs</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Slugs create clean, SEO-friendly URLs: /faq/category/general</li>
          <li>• Slugs are auto-generated from category names</li>
          <li>• Each slug must be unique</li>
          <li>• Use only lowercase letters, numbers, and hyphens</li>
        </ul>
      </div>
    </div>
  )
}