'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'

export default function EditProject() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Web Development')
  const [projectUrl, setProjectUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setTitle(data.title)
        setDescription(data.description)
        setCategory(data.category || 'Web Development')
        setProjectUrl(data.project_url || '')
        setImageUrl(data.image_url || '')
        setStatus(data.status || 'draft')
      }
      setFetching(false)
    }
    fetchProject()
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('projects')
      .update({ 
        title, 
        description, 
        category, 
        project_url: projectUrl, 
        image_url: imageUrl, 
        status 
      })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/admin/dashboard')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        router.push('/admin/dashboard')
      }
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-white">Edit Project</h1>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-2xl">
        <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option>Web Development</option>
              <option>UI/UX Design</option>
              <option>Mobile App</option>
              <option>E-commerce</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Project URL</label>
            <input
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="https://example.com"
            />
          </div>

          {/* Image Upload Component */}
          <div className="mb-6">
            <ImageUpload
              onUpload={setImageUrl}
              currentImage={imageUrl}
              label="Project Image"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? 'Updating...' : 'Update Project'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <Link
              href="/admin/dashboard"
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