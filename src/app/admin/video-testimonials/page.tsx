'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'

interface Proof {
  id: string
  title: string
  image_url: string
  media_type: string
  created_at: string
}

export default function VideoTestimonialsAdmin() {
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProofs()
  }, [])

  const fetchProofs = async () => {
    const { data } = await supabase
      .from('video_testimonials')
      .select('*')
      .order('display_order', { ascending: true })
    setProofs(data || [])
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!fileRef.current?.files?.[0]) return
    const file = fileRef.current.files[0]

    // Validate file size (15 MB)
    if (file.size > 15 * 1024 * 1024) {
      setMessage('File must be under 15 MB')
      return
    }

    // Determine media type from MIME
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    setUploading(true)
    setMessage('')

    const path = `proofs/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: insertError } = await supabase
      .from('video_testimonials')
      .insert({
        title: title || 'Client Proof',
        image_url: publicUrl,
        media_type: mediaType,
      })

    if (insertError) {
      setMessage(insertError.message)
    } else {
      setTitle('')
      setMessage('Uploaded successfully!')
      fetchProofs()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proof?')) return
    const { data } = await supabase
      .from('video_testimonials')
      .select('image_url')
      .eq('id', id)
      .single()

    if (data?.image_url) {
      const path = data.image_url.split('/').pop()
      if (path) {
        await supabase.storage.from('proofs').remove([`proofs/${path}`])
      }
    }

    await supabase.from('video_testimonials').delete().eq('id', id)
    fetchProofs()
  }

  if (loading)
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto" />
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    )

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Video Testimonials / Client Proofs</h1>

      {/* Upload form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g. Revenue growth screenshot or testimonial video"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
        />
        <p className="text-xs text-gray-500">
          Supported: images (JPG, PNG, WebP) and videos (MP4, MOV, WebM). Max 15 MB.
        </p>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <Plus className="w-4 h-4" /> Upload Image / Video
            </>
          )}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>

      {/* Grid of proofs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {proofs.map((proof) => (
          <div
            key={proof.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden border"
          >
            {proof.media_type === 'video' ? (
              <video
                src={proof.image_url}
                controls
                className="w-full h-40 object-cover"
              />
            ) : (
              <img
                src={proof.image_url}
                alt={proof.title}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-3 flex justify-between items-center">
              <p className="text-sm font-medium truncate">{proof.title}</p>
              <button
                onClick={() => handleDelete(proof.id)}
                className="text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {proofs.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-8">
            No proofs uploaded yet.
          </p>
        )}
      </div>

      <div className="mt-4">
        <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}