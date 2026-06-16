'use client'

import { FormData } from '@/types/growth-readiness'
import { useRef } from 'react'

interface Step7GrowthReadinessProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const supportTypes = [
  { value: 'Just exploring', label: 'Just exploring', description: 'Learning about growth opportunities' },
  { value: 'Looking for guidance', label: 'Looking for guidance', description: 'Need direction and advice' },
  { value: 'Looking for strategy', label: 'Looking for strategy', description: 'Need strategic planning' },
  { value: 'Looking for implementation support', label: 'Looking for implementation', description: 'Need hands-on execution' }
]

const timelines = [
  'Immediately',
  '30 days',
  '60 days',
  '90 days',
  'Just exploring'
]

export function Step7GrowthReadiness({ formData, updateField, errors }: Step7GrowthReadinessProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB')
        return
      }
      updateField('uploaded_file', file)
    }
  }

  const handleRemoveFile = () => {
    updateField('uploaded_file', null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold text-white">Growth Readiness</h3>
        <p className="text-[var(--text-on-dark-muted)]">Tell us about your readiness to grow</p>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-white">
          What type of support are you looking for? *
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {supportTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateField('support_type', type.value)}
              className={`rounded-lg border p-4 text-left transition-all ${
                formData.support_type === type.value
                  ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                  : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
              }`}
            >
              <div className="font-medium text-white">{type.label}</div>
              <div className="text-sm text-[var(--text-muted)]">{type.description}</div>
            </button>
          ))}
        </div>
        {errors.support_type && (
          <p className="mt-2 text-sm text-red-500">{errors.support_type}</p>
        )}
      </div>

      <div>
        <label htmlFor="improvement_timeline" className="mb-1 block text-sm font-medium text-white">
          When are you looking to make improvements? *
        </label>
        <select
          id="improvement_timeline"
          value={formData.improvement_timeline}
          onChange={(e) => updateField('improvement_timeline', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
            errors.improvement_timeline ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select timeline...</option>
          {timelines.map((timeline) => (
            <option key={timeline} value={timeline}>{timeline}</option>
          ))}
        </select>
        {errors.improvement_timeline && (
          <p className="mt-1 text-sm text-red-500">{errors.improvement_timeline}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white">
          Upload Supporting Documents (Optional)
        </label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-6 py-4 text-center text-sm text-[var(--text-muted)] hover:border-[var(--accent-orange)] transition-colors"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">📄</span>
              <span>Click to upload or drag and drop</span>
              <span className="text-xs">PDF, DOC, JPG, PNG (Max 10MB)</span>
            </div>
          </label>
        </div>
        {formData.uploaded_file && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-dark)] p-3">
            <span className="text-sm text-white">{formData.uploaded_file.name}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="ml-auto text-red-500 hover:text-red-400"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--bg-page)] text-[var(--accent-orange)] focus:ring-[var(--accent-orange)]"
          />
          <span className="text-sm text-[var(--text-on-dark-muted)]">
            I consent to Hbee Digitals processing my data to generate my growth profile 
            and for potential partnership opportunities. I understand my data will be 
            kept secure and private.
            <span className="text-red-500"> *</span>
          </span>
        </label>
        {errors.consent && (
          <p className="mt-2 text-sm text-red-500">{errors.consent}</p>
        )}
      </div>
    </div>
  )
}