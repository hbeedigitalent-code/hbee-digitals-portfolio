'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step9ReviewSubmitProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step9ReviewSubmit({ formData, updateField, errors }: Step9ReviewSubmitProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
        <h3 className="font-semibold text-white mb-2">Review Your Submission</h3>
        <p className="text-sm text-[var(--text-on-dark-muted)]">
          Please review your answers before submitting. You can go back to any section to make changes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Business</p>
          <p className="text-sm font-medium text-white">{formData.business_name || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Contact</p>
          <p className="text-sm font-medium text-white">{formData.full_name || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Services</p>
          <p className="text-sm font-medium text-white">{(formData.services_required || []).join(', ') || 'Not selected'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Budget</p>
          <p className="text-sm font-medium text-white">{formData.budget_range || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Timeline</p>
          <p className="text-sm font-medium text-white">{formData.expected_deadline || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Files Uploaded</p>
          <p className="text-sm font-medium text-white">{(formData.uploaded_files || []).length} files</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--bg-navy-mid)] text-[var(--accent-orange)] focus:ring-[var(--accent-orange)]"
          />
          <span className="text-sm text-[var(--text-on-dark-muted)]">
            I confirm that all the information provided is accurate and complete.
            I consent to Hbee Digitals processing my data to start the project.
            <span className="text-red-500"> *</span>
          </span>
        </label>
        {errors.consent && <p className="mt-2 text-sm text-red-500">{errors.consent}</p>}
      </div>
    </div>
  )
}