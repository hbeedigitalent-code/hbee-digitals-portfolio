'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewService() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [features, setFeatures] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const featuresArray = features.split(',').map(f => f.trim()).filter(f => f)
    
    const { error } = await supabase.from('services').insert([
      { 
        title, 
        description, 
        icon: icon || null, 
        features: featuresArray, 
        display_order: displayOrder, 
        is_active: true 
      }
    ])
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/admin/services')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-white">Add New Service</h1>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Service Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Web Development"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this service offers..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Icon URL (optional)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/svgs/web-development.svg"
            />
            <p className="text-xs text-gray-500 mt-1">Path to SVG icon in public folder</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Features (comma separated)</label>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="React/Next.js, Responsive Design, SEO Optimization"
            />
            <p className="text-xs text-gray-500 mt-1">Separate each feature with a comma</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0, 1, 2, 3..."
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? 'Saving...' : 'Save Service'}
            </button>
            <Link
              href="/admin/services"
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
