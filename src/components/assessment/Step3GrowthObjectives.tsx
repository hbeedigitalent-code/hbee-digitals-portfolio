'use client'

import { FormData } from '@/types/growth-readiness'

interface Step3GrowthObjectivesProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const goals = [
  'More Traffic',
  'More Sales',
  'Better Conversion Rates',
  'More Repeat Customers',
  'Higher Average Order Value',
  'Better Visibility',
  'SEO Performance',
  'Brand Positioning',
  'Customer Retention',
  'Operational Efficiency'
]

export function Step3GrowthObjectives({ formData, updateField, errors }: Step3GrowthObjectivesProps) {
  const toggleGoal = (goal: string) => {
    const current = formData.primary_goals || []
    if (current.includes(goal)) {
      updateField('primary_goals', current.filter(g => g !== goal))
    } else if (current.length < 3) {
      updateField('primary_goals', [...current, goal])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-white">
          90-Day Goals * (Select up to 3)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {goals.map((goal) => {
            const isSelected = (formData.primary_goals || []).includes(goal)
            const isMaxed = (formData.primary_goals || []).length >= 3 && !isSelected

            return (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                disabled={isMaxed}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                    : 'border-[var(--border)] bg-[var(--bg-navy-mid)] hover:border-[var(--accent-orange)]'
                } ${isMaxed ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{goal}</span>
                  {isSelected && (
                    <span className="text-[var(--accent-lime)]">✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {errors.primary_goals && (
          <p className="mt-2 text-sm text-red-500">{errors.primary_goals}</p>
        )}
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Selected: {(formData.primary_goals || []).length} of 3
        </p>
      </div>

      <div>
        <label htmlFor="success_vision" className="mb-1.5 block text-sm font-medium text-white">
          What does success look like for you? *
        </label>
        <textarea
          id="success_vision"
          value={formData.success_vision}
          onChange={(e) => updateField('success_vision', e.target.value)}
          rows={4}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.success_vision ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Describe your vision for success..."
        />
        {errors.success_vision && (
          <p className="mt-1 text-sm text-red-500">{errors.success_vision}</p>
        )}
      </div>
    </div>
  )
}