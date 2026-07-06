// src/components/onboarding/NewStep5ReviewSubmit.tsx
'use client'

import { NewOnboardingFormData } from '@/types/new-client-onboarding'

interface Step5ReviewSubmitProps {
  formData: NewOnboardingFormData
  updateField: <K extends keyof NewOnboardingFormData>(field: K, value: NewOnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step5ReviewSubmit({ formData, updateField, errors }: Step5ReviewSubmitProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Review Your Submission</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Please review your answers before submitting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Project Title</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.project_title || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Business</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.business_name || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Service</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.service_needed || 'Not selected'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Budget</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.budget_range || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Timeline</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.preferred_timeline || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Files Uploaded</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{(formData.uploaded_files || []).length} files</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Contact</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.full_name || 'Not provided'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)]">Email</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{formData.email || 'Not provided'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm text-[var(--text-muted)]">
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