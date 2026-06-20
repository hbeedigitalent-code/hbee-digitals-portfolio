'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step5StoreAccessProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

const platforms = ['Shopify', 'WooCommerce', 'BigCommerce', 'Magento', 'Custom', 'Other']

export function Step5StoreAccess({ formData, updateField, errors }: Step5StoreAccessProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="platform" className="mb-1.5 block text-sm font-medium text-white">
          What platform is your store built on? *
        </label>
        <select
          id="platform"
          value={formData.platform}
          onChange={(e) => updateField('platform', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
            errors.platform ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select platform</option>
          {platforms.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {errors.platform && <p className="mt-1 text-sm text-red-500">{errors.platform}</p>}
      </div>

      <div>
        <label htmlFor="needs_collaborator_access" className="mb-1.5 block text-sm font-medium text-white">
          Do you need to add team members as collaborators? *
        </label>
        <select
          id="needs_collaborator_access"
          value={formData.needs_collaborator_access}
          onChange={(e) => updateField('needs_collaborator_access', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 ${
            errors.needs_collaborator_access ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Maybe">Maybe later</option>
        </select>
        {errors.needs_collaborator_access && <p className="mt-1 text-sm text-red-500">{errors.needs_collaborator_access}</p>}
      </div>

      <div>
        <label htmlFor="collaborator_request_code" className="mb-1.5 block text-sm font-medium text-white">
          Collaborator Request Code (if applicable)
        </label>
        <input
          id="collaborator_request_code"
          type="text"
          value={formData.collaborator_request_code}
          onChange={(e) => updateField('collaborator_request_code', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="e.g., REQ-12345"
        />
      </div>

      <div>
        <label htmlFor="staff_access_email" className="mb-1.5 block text-sm font-medium text-white">
          Staff Access Email
        </label>
        <input
          id="staff_access_email"
          type="email"
          value={formData.staff_access_email}
          onChange={(e) => updateField('staff_access_email', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Email for staff access"
        />
      </div>

      <div>
        <label htmlFor="store_login_url" className="mb-1.5 block text-sm font-medium text-white">
          Store Login URL
        </label>
        <input
          id="store_login_url"
          type="url"
          value={formData.store_login_url}
          onChange={(e) => updateField('store_login_url', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="https://yourstore.com/admin"
        />
      </div>

      <div>
        <label htmlFor="access_instructions" className="mb-1.5 block text-sm font-medium text-white">
          Access Instructions
        </label>
        <textarea
          id="access_instructions"
          value={formData.access_instructions}
          onChange={(e) => updateField('access_instructions', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Any specific instructions for accessing your store..."
        />
      </div>

      <div>
        <label htmlFor="technical_notes" className="mb-1.5 block text-sm font-medium text-white">
          Technical Notes
        </label>
        <textarea
          id="technical_notes"
          value={formData.technical_notes}
          onChange={(e) => updateField('technical_notes', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          placeholder="Any technical notes or requirements..."
        />
      </div>
    </div>
  )
}