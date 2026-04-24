'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditService() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [features, setFeatures] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    const fetchService = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setTitle(data.title)
        setDescription(data.description)
        setIcon(data.icon || '')
        setFeatures(data.features?.join(', ') || '')
        setDisplayOrder(data.display_order)
        setIsActive(data.is_active)
      }
    }
    fetchService()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const featuresArray = features.split(',').map(f => f.trim()).filter(f => f)
    
    const { error } = await supabase
      .from('services')
      .update({ 
        title, 
        description, 
        icon: icon || null, 
        features: featuresArray, 
        display_order: displayOrder,
        is_active: isActive
      })
      .eq('id', id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/admin/services')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this service?')) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        router.push('/admin/services')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-white">Edit Service</h1>
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
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Icon URL</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="/svgs/web-development.svg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Features (comma separated)</label>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="React/Next.js, Responsive Design, SEO"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Active (visible on website)</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white rounded"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? 'Updating...' : 'Update Service'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <Link
              href="/admin/services"
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}