'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step8AdditionalRequestsProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step8AdditionalRequests({ formData, updateField, errors }: Step8AdditionalRequestsProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="additional_requests" className="mb-1.5 block text-sm font-medium text-white">
          Anything else you'd like to add?
        </label>
        <textarea
          id="additional_requests"
          value={formData.additional_requests}
          onChange={(e) => updateField('additional_requests', e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Any additional information, requests, or special considerations..."
        />
      </div>

      <div>
        <label htmlFor="special_instructions" className="mb-1.5 block text-sm font-medium text-white">
          Special Instructions
        </label>
        <textarea
          id="special_instructions"
          value={formData.special_instructions}
          onChange={(e) => updateField('special_instructions', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Any special instructions or requirements..."
        />
      </div>

      <div>
        <label htmlFor="success_metrics" className="mb-1.5 block text-sm font-medium text-white">
          How will you measure success?
        </label>
        <textarea
          id="success_metrics"
          value={formData.success_metrics}
          onChange={(e) => updateField('success_metrics', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="What metrics will define success for this project..."
        />
      </div>
    </div>
  )
}