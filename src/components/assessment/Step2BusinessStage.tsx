// src/components/assessment/Step2BusinessStage.tsx
'use client'

import { FormData } from '@/types/growth-readiness'
import SvgIcon from '@/components/ui/SvgIcon'

interface Step2BusinessStageProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const stages = [
  { value: 'Planning', label: 'Planning', description: 'Still in the planning phase' },
  { value: 'Recently Launched', label: 'Recently Launched', description: 'Launched within the last 6 months' },
  { value: 'Growing', label: 'Growing', description: 'Steady growth and traction' },
  { value: 'Established', label: 'Established', description: 'Stable business with consistent revenue' },
  { value: 'Scaling', label: 'Scaling', description: 'Ready to scale operations' }
]

const storeAges = [
  { value: 'Less than 3 months', label: 'Less than 3 months' },
  { value: '3–12 months', label: '3–12 months' },
  { value: '1–3 years', label: '1–3 years' },
  { value: '3+ years', label: '3+ years' }
]

export function Step2BusinessStage({ formData, updateField, errors }: Step2BusinessStageProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
          Current Business Stage <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {stages.map((stage) => (
            <button
              key={stage.value}
              type="button"
              onClick={() => updateField('business_stage', stage.value)}
              className={`rounded-lg border p-4 text-left transition-all ${
                formData.business_stage === stage.value
                  ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                  : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
              }`}
            >
              <div className="font-medium text-[var(--text-primary)]">{stage.label}</div>
              <div className="text-sm text-[var(--text-muted)]">{stage.description}</div>
            </button>
          ))}
        </div>
        {errors.business_stage && (
          <p className="mt-2 text-sm text-red-500">{errors.business_stage}</p>
        )}
      </div>

      <div>
        <label htmlFor="store_age" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          How long has your store been operating? <span className="text-red-500">*</span>
        </label>
        <select
          id="store_age"
          value={formData.store_age}
          onChange={(e) => updateField('store_age', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.store_age ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select store age</option>
          {storeAges.map((age) => (
            <option key={age.value} value={age.value}>{age.label}</option>
          ))}
        </select>
        {errors.store_age && (
          <p className="mt-1 text-sm text-red-500">{errors.store_age}</p>
        )}
      </div>
    </div>
  )
}