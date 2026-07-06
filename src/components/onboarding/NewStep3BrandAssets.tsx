// src/components/onboarding/NewStep3BrandAssets.tsx
'use client'

import { NewOnboardingFormData } from '@/types/new-client-onboarding'
import { useRef } from 'react'

interface Step3BrandAssetsProps {
  formData: NewOnboardingFormData
  updateField: <K extends keyof NewOnboardingFormData>(field: K, value: NewOnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step3BrandAssets({ formData, updateField }: Step3BrandAssetsProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Upload Brand Assets (Logo, Guidelines, Images)
        </label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg,.zip,.ai,.psd,.fig"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-6 py-6 text-center text-sm text-[var(--text-muted)] hover:border-[var(--accent)] transition-colors w-full"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📁</span>
              <span>Click to upload files</span>
              <span className="text-xs text-[var(--text-muted)]">Logo, Brand Guidelines, Images (Max 10MB each)</span>
            </div>
          </label>
        </div>

        {(formData.uploaded_files || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(formData.uploaded_files || []).map((file, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                <span className="text-sm text-[var(--text-primary)] truncate flex-1">{file.name}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}