// src/components/assessment/Step1BusinessProfile.tsx
'use client'

import { FormData } from '@/types/growth-readiness'
import SvgIcon from '@/components/ui/SvgIcon'

interface Step1BusinessProfileProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const industries = [
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Health & Wellness',
  'Home & Living',
  'Electronics',
  'Jewelry',
  'Pet Products',
  'Food & Beverage',
  'Automotive',
  'Digital Products',
  'Other'
]

const countries = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'New Zealand',
  'Other'
]

export function Step1BusinessProfile({ formData, updateField, errors }: Step1BusinessProfileProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Business Name */}
        <div>
          <label htmlFor="business_name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <SvgIcon name="business" size={18} color="var(--text-muted)" />
            </div>
            <input
              id="business_name"
              type="text"
              value={formData.business_name}
              onChange={(e) => updateField('business_name', e.target.value)}
              className={`w-full rounded-lg border bg-[var(--bg-page)] pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                errors.business_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
              }`}
              placeholder="Your business name"
            />
          </div>
          {errors.business_name && (
            <p className="mt-1 text-sm text-red-500">{errors.business_name}</p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Website URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <SvgIcon name="link" size={18} color="var(--text-muted)" />
            </div>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              className={`w-full rounded-lg border bg-[var(--bg-page)] pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                errors.website ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
              }`}
              placeholder="https://yourstore.com"
            />
          </div>
          {errors.website && (
            <p className="mt-1 text-sm text-red-500">{errors.website}</p>
          )}
        </div>

        {/* Contact Name */}
        <div>
          <label htmlFor="contact_name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Contact Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <SvgIcon name="user" size={18} color="var(--text-muted)" />
            </div>
            <input
              id="contact_name"
              type="text"
              value={formData.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
              className={`w-full rounded-lg border bg-[var(--bg-page)] pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                errors.contact_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
              }`}
              placeholder="Your full name"
            />
          </div>
          {errors.contact_name && (
            <p className="mt-1 text-sm text-red-500">{errors.contact_name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <SvgIcon name="email" size={18} color="var(--text-muted)" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={`w-full rounded-lg border bg-[var(--bg-page)] pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
              }`}
              placeholder="you@email.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
              errors.country ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="">Select your country</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-sm text-red-500">{errors.country}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) => updateField('industry', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
              errors.industry ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="">Select your industry</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          {errors.industry && (
            <p className="mt-1 text-sm text-red-500">{errors.industry}</p>
          )}
        </div>
      </div>
    </div>
  )
}