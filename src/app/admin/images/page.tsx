'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface ImageItem {
  name: string
  url: string
  created_at: string
  size: number
}

export default function ImageGallery() {
  const { user, loading: authLoading } = useAdminAuth()
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
      fetchImages()
    }
  }, [authLoading, user])

  const fetchImages = async () => {
    try {
      setLoading(true)
      // List all files in the projects folder
      const { data, error } = await supabase.storage
        .from('project-images')
        .list('projects', { limit: 100 })

      if (error) throw error

      const imageItems = await Promise.all(
        (data || []).map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('project-images')
            .getPublicUrl(`projects/${file.name}`)
          
          return {
            name: file.name,
            url: publicUrl,
            created_at: file.created_at || new Date().toISOString(),
            size: file.metadata?.size || 0
          }
        })
      )

      // Sort by newest first
      imageItems.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setImages(imageItems)
    } catch (err: any) {
      console.error('Error fetching images:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to load images' })
    } finally {
      setLoading(false)
    }
  }

  const deleteImage = async (imageName: string) => {
    if (!confirm('Delete this image? It will be removed from any projects using it.')) return

    try {
      const { error } = await supabase.storage
        .from('project-images')
        .remove([`projects/${imageName}`])

      if (error) throw error

      // Also update any projects using this image
      const { data: projects } = await supabase
        .from('projects')
        .select('id, image_url')
        .eq('image_url', `https://pxcickkwopkpbqofjmlg.supabase.co/storage/v1/object/public/project-images/projects/${imageName}`)

      if (projects && projects.length > 0) {
        for (const project of projects) {
          await supabase
            .from('projects')
            .update({ image_url: null })
            .eq('id', project.id)
        }
      }

      setMessage({ type: 'success', text: 'Image deleted successfully' })
      fetchImages()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete image' })
    }
  }

  const deleteSelected = async () => {
    if (selectedImages.size === 0) return
    if (!confirm(`Delete ${selectedImages.size} selected images?`)) return

    try {
      const imagesToDelete = Array.from(selectedImages).map(name => `projects/${name}`)
      const { error } = await supabase.storage
        .from('project-images')
        .remove(imagesToDelete)

      if (error) throw error

      setMessage({ type: 'success', text: `${selectedImages.size} images deleted successfully` })
      setSelectedImages(new Set())
      fetchImages()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete images' })
    }
  }

  const toggleSelect = (imageName: string) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(imageName)) {
      newSelected.delete(imageName)
    } else {
      newSelected.add(imageName)
    }
    setSelectedImages(newSelected)
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    setMessage({ type: 'success', text: 'URL copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading images...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="p-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Image Gallery</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">All Uploaded Images</h2>
            <p className="text-sm text-gray-500 mt-1">{images.length} total images</p>
          </div>
          <div className="flex gap-3">
            {selectedImages.size > 0 && (
              <button
                onClick={deleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Selected ({selectedImages.size})
              </button>
            )}
            <button
              onClick={fetchImages}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Image Grid */}
        {images.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-gray-500">No images uploaded yet</p>
            <Link
              href="/admin/projects/new"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Upload your first image →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((img) => (
              <div
                key={img.name}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${
                  selectedImages.has(img.name) ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                }`}
              >
                {/* Select Checkbox */}
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(img.name)}
                    onChange={() => toggleSelect(img.name)}
                    className="absolute top-2 left-2 w-4 h-4 z-10"
                  />
                  {/* Image */}
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={img.url}
                      alt={img.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-gray-500 truncate" title={img.name}>
                    {img.name.substring(0, 30)}...
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatFileSize(img.size)}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => copyToClipboard(img.url)}
                      className="flex-1 text-xs bg-gray-100 text-gray-700 py-1 rounded hover:bg-gray-200 transition"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => deleteImage(img.name)}
                      className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}