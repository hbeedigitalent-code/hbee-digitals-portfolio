'use client'

import { FormData } from '@/types/growth-readiness'

interface Step6GrowthChallengesProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

export function Step6GrowthChallenges({ formData, updateField, errors }: Step6GrowthChallengesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold text-white">Growth Challenges</h3>
        <p className="text-[var(--text-on-dark-muted)]">Help us understand what's holding you back</p>
      </div>

      <div>
        <label htmlFor="biggest_challenge" className="mb-1 block text-sm font-medium text-white">
          What's your biggest growth challenge? *
        </label>
        <textarea
          id="biggest_challenge"
          value={formData.biggest_challenge}
          onChange={(e) => updateField('biggest_challenge', e.target.value)}
          rows={4}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.biggest_challenge ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Describe your biggest challenge..."
        />
        {errors.biggest_challenge && (
          <p className="mt-1 text-sm text-red-500">{errors.biggest_challenge}</p>
        )}
      </div>

      <div>
        <label htmlFor="main_obstacle" className="mb-1 block text-sm font-medium text-white">
          What's your main obstacle to growth? *
        </label>
        <textarea
          id="main_obstacle"
          value={formData.main_obstacle}
          onChange={(e) => updateField('main_obstacle', e.target.value)}
          rows={4}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.main_obstacle ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Describe your main obstacle..."
        />
        {errors.main_obstacle && (
          <p className="mt-1 text-sm text-red-500">{errors.main_obstacle}</p>
        )}
      </div>
    </div>
  )
}