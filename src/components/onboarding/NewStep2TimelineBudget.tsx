// src/components/onboarding/NewStep2TimelineBudget.tsx
'use client'

import { NewOnboardingFormData } from '@/types/new-client-onboarding'

interface Step2TimelineBudgetProps {
  formData: NewOnboardingFormData
  updateField: <K extends keyof NewOnboardingFormData>(field: K, value: NewOnboardingFormData[K]) => void
  errors: Record<string, string>
}

const timelines = [
  'Immediate (1-2 weeks)',
  'Short term (1 month)',
  'Medium term (2-3 months)',
  'Long term (3-6 months)',
  'Flexible'
]

const budgetRanges = [
  '$1,000 - $2,500',
  '$2,500 - $5,000',
  '$5,000 - $10,000',
  '$10,000 - $25,000',
  '$25,000 - $50,000',
  '$50,000+'
]

export function Step2TimelineBudget({ formData, updateField, errors }: Step2TimelineBudgetProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="preferred_timeline" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Preferred Timeline *
        </label>
        <select
          id="preferred_timeline"
          value={formData.preferred_timeline}
          onChange={(e) => updateField('preferred_timeline', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.preferred_timeline ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
        >
          <option value="">Select a timeline</option>
          {timelines.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.preferred_timeline && <p className="mt-1 text-sm text-red-500">{errors.preferred_timeline}</p>}
      </div>

      <div>
        <label htmlFor="budget_range" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Budget Range *
        </label>
        <select
          id="budget_range"
          value={formData.budget_range}
          onChange={(e) => updateField('budget_range', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.budget_range ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
        >
          <option value="">Select budget range</option>
          {budgetRanges.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {errors.budget_range && <p className="mt-1 text-sm text-red-500">{errors.budget_range}</p>}
      </div>

      <div>
        <label htmlFor="main_challenge" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          What is the biggest challenge you're facing? *
        </label>
        <textarea
          id="main_challenge"
          value={formData.main_challenge}
          onChange={(e) => updateField('main_challenge', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.main_challenge ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
          placeholder="Describe your biggest challenge..."
        />
        {errors.main_challenge && <p className="mt-1 text-sm text-red-500">{errors.main_challenge}</p>}
      </div>
    </div>
  )
}