'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step3BusinessMarketingProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

const trafficSources = [
  'SEO', 'Social Media', 'Paid Ads', 'Email Marketing',
  'Content Marketing', 'Referrals', 'Direct Traffic', 'Marketplaces'
]

const platforms = ['Shopify', 'WooCommerce', 'BigCommerce', 'Magento', 'Custom', 'Other']

export function Step3BusinessMarketing({ formData, updateField, errors }: Step3BusinessMarketingProps) {
  const toggleTraffic = (source: string) => {
    const current = formData.traffic_sources || []
    if (current.includes(source)) {
      updateField('traffic_sources', current.filter(s => s !== source))
    } else {
      updateField('traffic_sources', [...current, source])
    }
  }

  const toggleCompetitor = (competitor: string) => {
    const current = formData.competitors || []
    if (current.includes(competitor)) {
      updateField('competitors', current.filter(c => c !== competitor))
    } else {
      updateField('competitors', [...current, competitor])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="target_audience" className="mb-1.5 block text-sm font-medium text-white">
          Who is your target audience? *
        </label>
        <textarea
          id="target_audience"
          value={formData.target_audience}
          onChange={(e) => updateField('target_audience', e.target.value)}
          rows={3}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
            errors.target_audience ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
          placeholder="Describe your ideal customer..."
        />
        {errors.target_audience && <p className="mt-1 text-sm text-red-500">{errors.target_audience}</p>}
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-white">
          How do you currently get traffic? * (Select all that apply)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {trafficSources.map((source) => {
            const isSelected = (formData.traffic_sources || []).includes(source)
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleTraffic(source)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                    : 'border-[var(--border)] bg-[var(--bg-navy-mid)] hover:border-[var(--accent-orange)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{source}</span>
                  {isSelected && <span className="text-[var(--accent-lime)]">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
        {errors.traffic_sources && <p className="mt-2 text-sm text-red-500">{errors.traffic_sources}</p>}
      </div>

      <div>
        <label htmlFor="marketing_challenges" className="mb-1.5 block text-sm font-medium text-white">
          What are your biggest marketing challenges?
        </label>
        <textarea
          id="marketing_challenges"
          value={formData.marketing_challenges}
          onChange={(e) => updateField('marketing_challenges', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Describe your marketing challenges..."
        />
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-white">
          Who are your top competitors? (Select all that apply)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {['Major Competitor', 'Direct Competitor', 'Emerging Competitor', 'Established Brand', 'No Competitors'].map((comp) => {
            const isSelected = (formData.competitors || []).includes(comp)
            return (
              <button
                key={comp}
                type="button"
                onClick={() => toggleCompetitor(comp)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                    : 'border-[var(--border)] bg-[var(--bg-navy-mid)] hover:border-[var(--accent-orange)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{comp}</span>
                  {isSelected && <span className="text-[var(--accent-lime)]">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="inspiration_websites" className="mb-1.5 block text-sm font-medium text-white">
          Which websites do you admire or draw inspiration from?
        </label>
        <input
          id="inspiration_websites"
          type="text"
          value={formData.inspiration_websites || ''}
          onChange={(e) => updateField('inspiration_websites', e.target.value.split(',').map(s => s.trim()))}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Enter websites separated by commas"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email_platform" className="mb-1.5 block text-sm font-medium text-white">
            Email Marketing Platform
          </label>
          <input
            id="email_platform"
            type="text"
            value={formData.email_platform}
            onChange={(e) => updateField('email_platform', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="e.g., Klaviyo, Mailchimp"
          />
        </div>

        <div>
          <label htmlFor="crm" className="mb-1.5 block text-sm font-medium text-white">
            CRM Platform
          </label>
          <input
            id="crm"
            type="text"
            value={formData.crm}
            onChange={(e) => updateField('crm', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="e.g., Salesforce, HubSpot"
          />
        </div>
      </div>
    </div>
  )
}