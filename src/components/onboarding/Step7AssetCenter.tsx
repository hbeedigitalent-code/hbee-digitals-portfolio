'use client'

import { OnboardingFormData } from '@/types/client-onboarding'
import { useRef } from 'react'

interface Step7AssetCenterProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

const fileCategories = [
  'Logos', 'Brand Guidelines', 'Product Images', 'Product Videos',
  'Website Content', 'Screenshots', 'Audit Reports', 'Other'
]

export function Step7AssetCenter({ formData, updateField }: Step7AssetCenterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const currentFiles = formData.uploaded_files || []
      updateField('uploaded_files', [...currentFiles, ...Array.from(files)])
    }
  }

  const removeFile = (index: number) => {
    const files = formData.uploaded_files || []
    updateField('uploaded_files', files.filter((_, i) => i !== index))
  }

  const addFileLink = () => {
    const links = formData.large_file_links || []
    updateField('large_file_links', [...links, { name: '', url: '' }])
  }

  const removeFileLink = (index: number) => {
    const links = formData.large_file_links || []
    updateField('large_file_links', links.filter((_, i) => i !== index))
  }

  const updateFileLink = (index: number, field: 'name' | 'url', value: string) => {
    const links = formData.large_file_links || []
    links[index][field] = value
    updateField('large_file_links', [...links])
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white">
          Upload Files (Images, PDFs, Documents)
        </label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg,.zip,.csv,.xlsx,.mp4,.mov,.ai,.psd,.fig"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-navy-mid)] px-6 py-4 text-center text-sm text-[var(--text-muted)] hover:border-[var(--accent-orange)] transition-colors"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">📁</span>
              <span>Click to upload files</span>
              <span className="text-xs">Images, PDFs, Documents (Max 10MB each)</span>
            </div>
          </label>
        </div>

        {(formData.uploaded_files || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(formData.uploaded_files || []).map((file, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-3">
                <span className="text-sm text-white">{file.name}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white">Large File Links</label>
          <button
            type="button"
            onClick={addFileLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-orange)] hover:text-[var(--orange-600)]"
          >
            <span className="text-lg leading-none">+</span> Add Link
          </button>
        </div>

        <p className="mb-3 text-xs text-[var(--text-muted)]">
          For files larger than 10MB, use Google Drive, Dropbox, WeTransfer, or cloud folder links.
        </p>

        {(formData.large_file_links || []).map((link, index) => (
          <div key={index} className="mb-3 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">File Name</label>
              <input
                type="text"
                value={link.name}
                onChange={(e) => updateFileLink(index, 'name', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="e.g., Brand Guidelines"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">File URL</label>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateFileLink(index, 'url', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <button
                type="button"
                onClick={() => removeFileLink(index)}
                className="text-red-400 hover:text-red-300 pb-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}