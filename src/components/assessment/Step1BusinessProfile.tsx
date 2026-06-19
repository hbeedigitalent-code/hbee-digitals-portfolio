'use client'

import { FormData } from '@/types/growth-readiness'

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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="business_name" className="mb-1.5 block text-sm font-medium text-white">
            Business Name *
          </label>
          <input
            id="business_name"
            type="text"
            value={formData.business_name}
            onChange={(e) => updateField('business_name', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.business_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="Your business name"
          />
          {errors.business_name && (
            <p className="mt-1 text-sm text-red-500">{errors.business_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-white">
            Website URL *
          </label>
          <input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.website ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="https://yourstore.com"
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-500">{errors.website}</p>
          )}
        </div>

        <div>
          <label htmlFor="contact_name" className="mb-1.5 block text-sm font-medium text-white">
            Contact Name *
          </label>
          <input
            id="contact_name"
            type="text"
            value={formData.contact_name}
            onChange={(e) => updateField('contact_name', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.contact_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="Your full name"
          />
          {errors.contact_name && (
            <p className="mt-1 text-sm text-red-500">{errors.contact_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="you@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-white">
            Country *
          </label>
          <select
            id="country"
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
              errors.country ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="" className="bg-[var(--bg-navy-mid)]">Select your country</option>
            {countries.map((country) => (
              <option key={country} value={country} className="bg-[var(--bg-navy-mid)]">{country}</option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-sm text-red-500">{errors.country}</p>
          )}
        </div>

        <div>
          <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-white">
            Industry *
          </label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) => updateField('industry', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
              errors.industry ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="" className="bg-[var(--bg-navy-mid)]">Select your industry</option>
            {industries.map((industry) => (
              <option key={industry} value={industry} className="bg-[var(--bg-navy-mid)]">{industry}</option>
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