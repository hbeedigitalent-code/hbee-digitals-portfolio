'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

interface PortfolioItem {
  id: string
  name: string
  category: string
  result: string
  image_url: string
  tag: string
  featured: boolean
  url: string
  description: string
  display_order: number
  is_active: boolean
  created_at: string
}

export default function AdminPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    result: '',
    image_url: '',
    tag: '',
    featured: false,
    url: '',
    description: '',
    display_order: 0,
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const categories = [
    { id: 'all', label: 'All' },
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
  ]

  useEffect(() => {
    checkAuth()
    fetchItems()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchItems = async () => {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('display_order', { ascending: true })
    
    setItems(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'food',
      result: '',
      image_url: '',
      tag: '',
      featured: false,
      url: '',
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
        .from('portfolio_items')
        .update({
          name: formData.name,
          category: formData.category,
          result: formData.result,
          image_url: formData.image_url,
          tag: formData.tag,
          featured: formData.featured,
          url: formData.url,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Portfolio item updated successfully!' })
        fetchItems()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('portfolio_items')
        .insert([formData])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Portfolio item created successfully!' })
        fetchItems()
        resetForm()
      }
    }
    setSaving(false)
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      result: item.result || '',
      image_url: item.image_url || '',
      tag: item.tag || '',
      featured: item.featured || false,
      url: item.url || '',
      description: item.description || '',
      display_order: item.display_order || 0,
      is_active: item.is_active !== false
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this portfolio item?')) {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Portfolio item deleted successfully!' })
        fetchItems()
      }
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      fetchItems()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading portfolio items...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Portfolio Management</h2>
          <p className="text-sm text-gray-500 mt-1">Add and manage portfolio projects displayed on the website</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + Add Project
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
            {editingItem ? 'Edit Portfolio Item' : 'Add New Portfolio Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g., Sobrii"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {categories.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Result Metric</label>
                <input
                  type="text"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g., +67% Conversion"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tag</label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g., Shopify Redesign"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Project description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Project URL (optional)</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <ImageUpload
                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                currentImage={formData.image_url}
                folder="portfolio"
                label="Project Image"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0, 1, 2..."
                />
                <p className="text-xs text-gray-400 mt-1">Lower numbers appear first</p>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Featured on Homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Active (visible on website)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : (editingItem ? 'Update Project' : 'Create Project')}
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-500">No portfolio items yet. Click "Add Project" to create your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Image</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Category</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Featured</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Order</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                      {item.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-xl">📷</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-gray-800">{item.name}</td>
                    <td className="p-4 text-sm text-gray-500">{categories.find(c => c.id === item.category)?.label || item.category}</td>
                    <td className="p-4">
                      {item.featured && <span className="text-yellow-500 text-lg">★</span>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{item.display_order}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(item.id, item.is_active)}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                        >
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">📁 About Portfolio Management</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Add projects with images, categories, and result metrics</li>
          <li>• Featured projects appear on the homepage preview section</li>
          <li>• Display order controls the sorting on the portfolio page</li>
          <li>• Inactive items won't appear on the public website</li>
          <li>• Categories match the filter icons on the portfolio page</li>
        </ul>
      </div>
    </div>
  )
}