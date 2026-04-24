'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface ImageItem {
  name: string
  url: string
  created_at: string
}

export default function ImageGallery({ onSelect }: { onSelect?: (url: string) => void }) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
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
            created_at: file.created_at || new Date().toISOString()
          }
        })
      )

      setImages(imageItems)
    } catch (err) {
      console.error('Error fetching images:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteImage = async (path: string) => {
    if (confirm('Delete this image?')) {
      const { error } = await supabase.storage
        .from('project-images')
        .remove([`projects/${path}`])
      
      if (error) {
        alert('Error deleting image')
      } else {
        fetchImages()
      }
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading images...</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {images.map((img) => (
        <div key={img.name} className="relative group">
          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={img.url}
              alt={img.name}
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            {onSelect && (
              <button
                onClick={() => onSelect(img.url)}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
              >
                Select
              </button>
            )}
            <button
              onClick={() => deleteImage(img.name)}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}