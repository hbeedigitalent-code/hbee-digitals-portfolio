'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step4BrandInfoProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step4BrandInfo({ formData, updateField, errors }: Step4BrandInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="brand_mission" className="mb-1.5 block text-sm font-medium text-white">
          What is your brand's mission? *
        </label>
        <textarea
          id="brand_mission"
          value={formData.brand_mission}
          onChange={(e) => updateField('brand_mission', e.target.value)}
          rows={2}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.brand_mission ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="What is your brand's purpose and mission?"
        />
        {errors.brand_mission && <p className="mt-1 text-sm text-red-500">{errors.brand_mission}</p>}
      </div>

      <div>
        <label htmlFor="brand_values" className="mb-1.5 block text-sm font-medium text-white">
          What are your brand's core values? *
        </label>
        <textarea
          id="brand_values"
          value={formData.brand_values}
          onChange={(e) => updateField('brand_values', e.target.value)}
          rows={2}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.brand_values ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="What values define your brand?"
        />
        {errors.brand_values && <p className="mt-1 text-sm text-red-500">{errors.brand_values}</p>}
      </div>

      <div>
        <label htmlFor="brand_voice" className="mb-1.5 block text-sm font-medium text-white">
          How would you describe your brand's voice and tone?
        </label>
        <textarea
          id="brand_voice"
          value={formData.brand_voice}
          onChange={(e) => updateField('brand_voice', e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="e.g., Professional, Friendly, Inspirational, Technical"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="brand_colors" className="mb-1.5 block text-sm font-medium text-white">
            Brand Colors (Primary)
          </label>
          <input
            id="brand_colors"
            type="text"
            value={formData.brand_colors}
            onChange={(e) => updateField('brand_colors', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="e.g., #FF6B00, #003366"
          />
        </div>

        <div>
          <label htmlFor="brand_fonts" className="mb-1.5 block text-sm font-medium text-white">
            Brand Fonts
          </label>
          <input
            id="brand_fonts"
            type="text"
            value={formData.brand_fonts}
            onChange={(e) => updateField('brand_fonts', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="e.g., Inter, Playfair Display"
          />
        </div>
      </div>

      <div>
        <label htmlFor="target_customer_profile" className="mb-1.5 block text-sm font-medium text-white">
          Describe your ideal customer in detail *
        </label>
        <textarea
          id="target_customer_profile"
          value={formData.target_customer_profile}
          onChange={(e) => updateField('target_customer_profile', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.target_customer_profile ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Age, location, interests, buying behavior, etc."
        />
        {errors.target_customer_profile && <p className="mt-1 text-sm text-red-500">{errors.target_customer_profile}</p>}
      </div>

      <div>
        <label htmlFor="existing_brand_guidelines" className="mb-1.5 block text-sm font-medium text-white">
          Do you have existing brand guidelines?
        </label>
        <select
          id="existing_brand_guidelines"
          value={formData.existing_brand_guidelines}
          onChange={(e) => updateField('existing_brand_guidelines', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
        >
          <option value="">Select...</option>
          <option value="Yes">Yes, I have detailed guidelines</option>
          <option value="Partial">I have some guidelines</option>
          <option value="No">No, I need help creating them</option>
        </select>
      </div>
    </div>
  )
}