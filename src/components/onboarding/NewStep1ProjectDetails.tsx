// src/components/onboarding/NewStep1ProjectDetails.tsx
'use client'

import { NewOnboardingFormData } from '@/types/new-client-onboarding'

interface Step1ProjectDetailsProps {
  formData: NewOnboardingFormData
  updateField: <K extends keyof NewOnboardingFormData>(field: K, value: NewOnboardingFormData[K]) => void
  errors: Record<string, string>
}

const services = [
  'Website Development',
  'Ecommerce Development',
  'Shopify Optimization',
  'UI/UX Design',
  'Digital Marketing',
  'SEO Services',
  'Brand Identity',
  'Content Strategy',
  'Other'
]

export function Step1ProjectDetails({ formData, updateField, errors }: Step1ProjectDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="project_title" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Project Title *
        </label>
        <input
          id="project_title"
          type="text"
          value={formData.project_title}
          onChange={(e) => updateField('project_title', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.project_title ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
          placeholder="e.g., Website Redesign"
        />
        {errors.project_title && <p className="mt-1 text-sm text-red-500">{errors.project_title}</p>}
      </div>

      <div>
        <label htmlFor="business_name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Business Name *
        </label>
        <input
          id="business_name"
          type="text"
          value={formData.business_name}
          onChange={(e) => updateField('business_name', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.business_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
          placeholder="Your business name"
        />
        {errors.business_name && <p className="mt-1 text-sm text-red-500">{errors.business_name}</p>}
      </div>

      <div>
        <label htmlFor="website_url" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Website URL
        </label>
        <input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) => updateField('website_url', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="https://yourstore.com"
        />
      </div>

      <div>
        <label htmlFor="service_needed" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Service Needed *
        </label>
        <select
          id="service_needed"
          value={formData.service_needed}
          onChange={(e) => updateField('service_needed', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.service_needed ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
        >
          <option value="">Select a service</option>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.service_needed && <p className="mt-1 text-sm text-red-500">{errors.service_needed}</p>}
      </div>

      <div>
        <label htmlFor="project_goals" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Project Goals *
        </label>
        <textarea
          id="project_goals"
          value={formData.project_goals}
          onChange={(e) => updateField('project_goals', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.project_goals ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }`}
          placeholder="What are you hoping to achieve with this project?"
        />
        {errors.project_goals && <p className="mt-1 text-sm text-red-500">{errors.project_goals}</p>}
      </div>
    </div>
  )
}