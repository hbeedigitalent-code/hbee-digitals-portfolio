'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step2ProjectDetailsProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

const services = [
  'Web Development', 'UI/UX Design', 'E-Commerce Solutions',
  'Digital Marketing', 'Brand Strategy', 'SEO Optimization',
  'PPC Management', 'Technical Consulting', 'Maintenance & Support'
]

const priorities = [
  'Website Performance', 'Mobile Responsiveness', 'User Experience',
  'Conversion Rate', 'Brand Consistency', 'SEO Performance',
  'Site Speed', 'Checkout Process', 'Product Presentation'
]

const budgetRanges = [
  '$1,000 - $2,500', '$2,500 - $5,000', '$5,000 - $10,000',
  '$10,000 - $25,000', '$25,000 - $50,000', '$50,000+'
]

export function Step2ProjectDetails({ formData, updateField, errors }: Step2ProjectDetailsProps) {
  const toggleService = (service: string) => {
    const current = formData.services_required || []
    if (current.includes(service)) {
      updateField('services_required', current.filter(s => s !== service))
    } else {
      updateField('services_required', [...current, service])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-white">
          What services are you interested in? * (Select all that apply)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => {
            const isSelected = (formData.services_required || []).includes(service)
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleService(service)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                    : 'border-[var(--border)] bg-[var(--bg-navy-mid)] hover:border-[var(--accent-orange)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{service}</span>
                  {isSelected && <span className="text-[var(--accent-lime)]">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
        {errors.services_required && <p className="mt-2 text-sm text-red-500">{errors.services_required}</p>}
      </div>

      <div>
        <label htmlFor="project_goal" className="mb-1.5 block text-sm font-medium text-white">
          What is the main goal of this project? *
        </label>
        <textarea
          id="project_goal"
          value={formData.project_goal}
          onChange={(e) => updateField('project_goal', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.project_goal ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="What are you hoping to achieve with this project?"
        />
        {errors.project_goal && <p className="mt-1 text-sm text-red-500">{errors.project_goal}</p>}
      </div>

      <div>
        <label htmlFor="main_challenge" className="mb-1.5 block text-sm font-medium text-white">
          What is the biggest challenge you're facing?
        </label>
        <textarea
          id="main_challenge"
          value={formData.main_challenge}
          onChange={(e) => updateField('main_challenge', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Describe your biggest challenge..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="priority_1" className="mb-1.5 block text-sm font-medium text-white">
            Priority 1 *
          </label>
          <select
            id="priority_1"
            value={formData.priority_1}
            onChange={(e) => updateField('priority_1', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="">Select...</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority_2" className="mb-1.5 block text-sm font-medium text-white">
            Priority 2
          </label>
          <select
            id="priority_2"
            value={formData.priority_2}
            onChange={(e) => updateField('priority_2', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="">Select...</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority_3" className="mb-1.5 block text-sm font-medium text-white">
            Priority 3
          </label>
          <select
            id="priority_3"
            value={formData.priority_3}
            onChange={(e) => updateField('priority_3', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="">Select...</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="target_outcome" className="mb-1.5 block text-sm font-medium text-white">
          What does success look like for this project? *
        </label>
        <textarea
          id="target_outcome"
          value={formData.target_outcome}
          onChange={(e) => updateField('target_outcome', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.target_outcome ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Describe what success looks like..."
        />
        {errors.target_outcome && <p className="mt-1 text-sm text-red-500">{errors.target_outcome}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="expected_deadline" className="mb-1.5 block text-sm font-medium text-white">
            Expected Deadline
          </label>
          <input
            id="expected_deadline"
            type="date"
            value={formData.expected_deadline}
            onChange={(e) => updateField('expected_deadline', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          />
        </div>

        <div>
          <label htmlFor="budget_range" className="mb-1.5 block text-sm font-medium text-white">
            Budget Range *
          </label>
          <select
            id="budget_range"
            value={formData.budget_range}
            onChange={(e) => updateField('budget_range', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
              errors.budget_range ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="">Select budget range</option>
            {budgetRanges.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.budget_range && <p className="mt-1 text-sm text-red-500">{errors.budget_range}</p>}
        </div>
      </div>
    </div>
  )
}