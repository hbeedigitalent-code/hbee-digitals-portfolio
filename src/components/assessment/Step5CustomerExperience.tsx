'use client'

import { FormData } from '@/types/growth-readiness'

interface Step5CustomerExperienceProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const yesNoOptions = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Partially', label: 'Partially' },
  { value: 'Planning to', label: 'Planning to' }
]

const publishingOptions = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Rarely', label: 'Rarely' },
  { value: 'Never', label: 'Never' }
]

export function Step5CustomerExperience({ formData, updateField, errors }: Step5CustomerExperienceProps) {
  const renderSelect = (field: keyof FormData, label: string, options: typeof yesNoOptions) => (
    <div>
      <label htmlFor={field} className="mb-1 block text-sm font-medium text-white">
        {label} *
      </label>
      <select
        id={field}
        value={formData[field] as string}
        onChange={(e) => updateField(field, e.target.value)}
        className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
          errors[field] ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
        }`}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {errors[field] && (
        <p className="mt-1 text-sm text-red-500">{errors[field]}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold text-white">Customer Experience</h3>
        <p className="text-[var(--text-on-dark-muted)]">How do you engage with your customers?</p>
      </div>

      <div className="grid gap-4">
        {renderSelect('email_capture', 'Do you capture email addresses?', yesNoOptions)}
        {renderSelect('email_automations', 'Do you use email automation flows?', yesNoOptions)}
        {renderSelect('customer_reviews', 'Do you collect customer reviews?', yesNoOptions)}
        
        <div>
          <label htmlFor="content_publishing" className="mb-1 block text-sm font-medium text-white">
            How often do you publish content? *
          </label>
          <select
            id="content_publishing"
            value={formData.content_publishing}
            onChange={(e) => updateField('content_publishing', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
              errors.content_publishing ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="">Select frequency...</option>
            {publishingOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.content_publishing && (
            <p className="mt-1 text-sm text-red-500">{errors.content_publishing}</p>
          )}
        </div>

        {renderSelect('upsells_crosssells', 'Do you use upsells or cross-sells?', yesNoOptions)}
      </div>
    </div>
  )
}