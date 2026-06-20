'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step1ClientInfoProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

const industries = [
  'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness',
  'Home & Living', 'Electronics', 'Jewelry', 'Pet Products',
  'Food & Beverage', 'Automotive', 'Digital Products', 'Other'
]

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
  'New Zealand', 'Other'
]

const stages = [
  'Planning', 'Recently Launched', 'Growing', 'Established', 'Scaling'
]

const revenueRanges = [
  '$0 - $1,000', '$1,000 - $5,000', '$5,000 - $10,000',
  '$10,000 - $50,000', '$50,000 - $100,000', '$100,000+'
]

const heardOptions = [
  'LinkedIn', 'Instagram', 'X', 'Google Search',
  'Referral', 'Podcast', 'Event', 'YouTube',
  'Email', 'Other'
]

export function Step1ClientInfo({ formData, updateField, errors }: Step1ClientInfoProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-white">
            Full Name *
          </label>
          <input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="Your full name"
          />
          {errors.full_name && <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>}
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
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-medium text-white">
            WhatsApp Number
          </label>
          <input
            id="whatsapp"
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => updateField('whatsapp', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="+1 234 567 8900"
          />
        </div>

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
          {errors.business_name && <p className="mt-1 text-sm text-red-500">{errors.business_name}</p>}
        </div>

        <div>
          <label htmlFor="website_url" className="mb-1.5 block text-sm font-medium text-white">
            Website URL *
          </label>
          <input
            id="website_url"
            type="url"
            value={formData.website_url}
            onChange={(e) => updateField('website_url', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.website_url ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="https://yourstore.com"
          />
          {errors.website_url && <p className="mt-1 text-sm text-red-500">{errors.website_url}</p>}
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
            <option value="">Select your country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
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
            <option value="">Select your industry</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          {errors.industry && <p className="mt-1 text-sm text-red-500">{errors.industry}</p>}
        </div>

        <div>
          <label htmlFor="business_stage" className="mb-1.5 block text-sm font-medium text-white">
            Business Stage *
          </label>
          <select
            id="business_stage"
            value={formData.business_stage}
            onChange={(e) => updateField('business_stage', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
              errors.business_stage ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
          >
            <option value="">Select your stage</option>
            {stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.business_stage && <p className="mt-1 text-sm text-red-500">{errors.business_stage}</p>}
        </div>

        <div>
          <label htmlFor="monthly_revenue" className="mb-1.5 block text-sm font-medium text-white">
            Monthly Revenue
          </label>
          <select
            id="monthly_revenue"
            value={formData.monthly_revenue}
            onChange={(e) => updateField('monthly_revenue', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="">Select revenue range</option>
            {revenueRanges.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="heard_about_us" className="mb-1.5 block text-sm font-medium text-white">
            How did you hear about us?
          </label>
          <select
            id="heard_about_us"
            value={formData.heard_about_us}
            onChange={(e) => updateField('heard_about_us', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="">Select an option</option>
            {heardOptions.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}