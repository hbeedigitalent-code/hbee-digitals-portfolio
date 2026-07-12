// src/components/assessment/Step4VisibilityMarketing.tsx
'use client'

import { FormData } from '@/types/growth-readiness'
import SvgIcon from '@/components/ui/SvgIcon'

interface Step4VisibilityMarketingProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const channels = [
  'SEO',
  'Paid Ads',
  'Social Media',
  'Email Marketing',
  'Content Marketing',
  'Referrals',
  'Direct Traffic',
  'Marketplaces'
]

const paidAdPlatforms = [
  'Google Ads',
  'Meta Ads (Facebook/Instagram)',
  'TikTok Ads',
  'LinkedIn Ads',
  'Pinterest Ads',
  'Snapchat Ads',
  'Amazon Ads',
  'Other'
]

const paidAdsOptions = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Planning to', label: 'Planning to' }
]

export function Step4VisibilityMarketing({ formData, updateField, errors }: Step4VisibilityMarketingProps) {
  const toggleChannel = (channel: string) => {
    const current = formData.marketing_channels || []
    if (current.includes(channel)) {
      updateField('marketing_channels', current.filter(c => c !== channel))
    } else {
      updateField('marketing_channels', [...current, channel])
    }
  }

  const togglePlatform = (platform: string) => {
    const current = formData.paid_ad_platforms || []
    if (current.includes(platform)) {
      updateField('paid_ad_platforms', current.filter(p => p !== platform))
    } else {
      updateField('paid_ad_platforms', [...current, platform])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
          How do customers discover you? <span className="text-red-500">*</span> <span className="text-sm text-[var(--text-muted)]">(Select all that apply)</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => {
            const isSelected = (formData.marketing_channels || []).includes(channel)

            return (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                    : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)]">{channel}</span>
                  {isSelected && (
                    <span className="text-[var(--accent-lime)] font-bold">✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {errors.marketing_channels && (
          <p className="mt-2 text-sm text-red-500">{errors.marketing_channels}</p>
        )}
      </div>

      <div>
        <label htmlFor="best_channel" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          What's your best performing channel? <span className="text-red-500">*</span>
        </label>
        <select
          id="best_channel"
          value={formData.best_channel}
          onChange={(e) => updateField('best_channel', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.best_channel ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select your best channel</option>
          {channels.map((channel) => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>
        {errors.best_channel && (
          <p className="mt-1 text-sm text-red-500">{errors.best_channel}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
          Do you use paid advertising? <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {paidAdsOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('paid_ads_usage', option.value)}
              className={`rounded-lg border px-6 py-3 transition-all ${
                formData.paid_ads_usage === option.value
                  ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                  : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
              }`}
            >
              <span className="text-[var(--text-primary)]">{option.label}</span>
            </button>
          ))}
        </div>
        {errors.paid_ads_usage && (
          <p className="mt-2 text-sm text-red-500">{errors.paid_ads_usage}</p>
        )}
      </div>

      {formData.paid_ads_usage === 'Yes' && (
        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
            Which platforms do you use? <span className="text-sm text-[var(--text-muted)]">(Select all that apply)</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {paidAdPlatforms.map((platform) => {
              const isSelected = (formData.paid_ad_platforms || []).includes(platform)

              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                      : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{platform}</span>
                    {isSelected && (
                      <span className="text-[var(--accent-lime)] font-bold">✓</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
          How confident are you in your current visibility? <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="10"
            value={formData.visibility_confidence}
            onChange={(e) => updateField('visibility_confidence', parseInt(e.target.value))}
            className="w-full accent-[var(--accent-orange)]"
          />
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Not confident</span>
            <span className="font-medium text-[var(--text-primary)]">{formData.visibility_confidence}/10</span>
            <span>Very confident</span>
          </div>
        </div>
        {errors.visibility_confidence && (
          <p className="mt-1 text-sm text-red-500">{errors.visibility_confidence}</p>
        )}
      </div>
    </div>
  )
}