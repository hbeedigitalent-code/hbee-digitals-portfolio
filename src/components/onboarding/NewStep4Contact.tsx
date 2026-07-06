// src/components/onboarding/NewStep4Contact.tsx
'use client'

import { NewOnboardingFormData } from '@/types/new-client-onboarding'

interface Step4ContactProps {
  formData: NewOnboardingFormData
  updateField: <K extends keyof NewOnboardingFormData>(field: K, value: NewOnboardingFormData[K]) => void
  errors: Record<string, string>
}

const communicationMethods = [
  'Email',
  'WhatsApp',
  'Phone Call',
  'Video Call'
]

export function Step4Contact({ formData, updateField, errors }: Step4ContactProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Full Name *
          </label>
          <input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
            }`}
            placeholder="Your full name"
          />
          {errors.full_name && <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
            }`}
            placeholder="you@email.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          WhatsApp Number *
        </label>
        <input
          id="whatsapp"
          type="tel"
          value={formData.whatsapp}
          onChange={(e) => updateField('whatsapp', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.whatsapp ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
          placeholder="+1 234 567 8900"
        />
        {errors.whatsapp && <p className="mt-1 text-sm text-red-500">{errors.whatsapp}</p>}
      </div>

      <div>
        <label htmlFor="communication_method" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Preferred Communication Method *
        </label>
        <select
          id="communication_method"
          value={formData.communication_method}
          onChange={(e) => updateField('communication_method', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.communication_method ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
        >
          <option value="">Select a method</option>
          {communicationMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {errors.communication_method && <p className="mt-1 text-sm text-red-500">{errors.communication_method}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Additional Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="Any additional information you'd like to share..."
        />
      </div>
    </div>
  )
}