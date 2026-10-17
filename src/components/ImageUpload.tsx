'use client'

import { useState, useCallback, useId, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { portfolioUploadExtension } from '@/lib/portfolio-upload'

interface ImageUploadProps {
  onUpload: (url: string) => void
  currentImage?: string
  folder?: string
  label?: string
  contain?: boolean
  disabled?: boolean
  onUploadingChange?: (uploading: boolean) => void
}

export default function ImageUpload({ onUpload, currentImage, folder = 'projects', label = 'Upload Image', contain = false, disabled = false, onUploadingChange }: ImageUploadProps) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentImage || '')
  const [error, setError] = useState<string | null>(null)
  const uploadPending = useRef(false)

  const uploadImage = useCallback(async (file: File) => {
    if (!file || disabled || uploadPending.current) return

    uploadPending.current = true
    onUploadingChange?.(true)
    setUploading(true)
    setError(null)

    try {
      const fileExt = await portfolioUploadExtension(file)
      if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)) throw new Error('Invalid portfolio upload folder.')
      // Never reuse user-supplied filenames or file extensions.
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setPreview(publicUrl)
      onUpload(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      uploadPending.current = false
      onUploadingChange?.(false)
      setUploading(false)
    }
  }, [folder, onUpload, disabled, onUploadingChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadImage(file)
  }, [uploadImage])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
  }, [uploadImage])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      
      {/* Preview */}
      {preview && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
          <Image
            src={preview}
            alt="Preview"
            fill
            unoptimized
            sizes="128px"
            className={contain ? 'object-contain' : 'object-cover'}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            aria-label={`Remove ${label}`}
            onClick={() => {
              setPreview('')
              onUpload('')
            }}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer"
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          onChange={handleChange}
          className="hidden"
          id={inputId}
          disabled={disabled || uploading}
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer block"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-600">
                Click or drag & drop to upload
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPEG, WebP, GIF or AVIF up to 5MB
              </p>
            </div>
          )}
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
