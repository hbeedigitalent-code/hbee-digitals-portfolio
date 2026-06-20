'use client'

import { OnboardingFormData } from '@/types/client-onboarding'

interface Step6TeamApprovalsProps {
  formData: OnboardingFormData
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  errors: Record<string, string>
}

export function Step6TeamApprovals({ formData, updateField, errors }: Step6TeamApprovalsProps) {
  const addTeamMember = () => {
    const members = formData.team_members || []
    updateField('team_members', [...members, { name: '', role: '', email: '' }])
  }

  const removeTeamMember = (index: number) => {
    const members = formData.team_members || []
    updateField('team_members', members.filter((_, i) => i !== index))
  }

  const updateTeamMember = (index: number, field: 'name' | 'role' | 'email', value: string) => {
    const members = formData.team_members || []
    members[index][field] = value
    updateField('team_members', [...members])
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="decision_maker_name" className="mb-1.5 block text-sm font-medium text-white">
            Decision Maker Name *
          </label>
          <input
            id="decision_maker_name"
            type="text"
            value={formData.decision_maker_name}
            onChange={(e) => updateField('decision_maker_name', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.decision_maker_name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="Full name"
          />
          {errors.decision_maker_name && <p className="mt-1 text-sm text-red-500">{errors.decision_maker_name}</p>}
        </div>

        <div>
          <label htmlFor="decision_maker_role" className="mb-1.5 block text-sm font-medium text-white">
            Decision Maker Role
          </label>
          <input
            id="decision_maker_role"
            type="text"
            value={formData.decision_maker_role}
            onChange={(e) => updateField('decision_maker_role', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="e.g., CEO, Marketing Director"
          />
        </div>

        <div>
          <label htmlFor="decision_maker_email" className="mb-1.5 block text-sm font-medium text-white">
            Decision Maker Email *
          </label>
          <input
            id="decision_maker_email"
            type="email"
            value={formData.decision_maker_email}
            onChange={(e) => updateField('decision_maker_email', e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
              errors.decision_maker_email ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
            }`}
            placeholder="decisionmaker@email.com"
          />
          {errors.decision_maker_email && <p className="mt-1 text-sm text-red-500">{errors.decision_maker_email}</p>}
        </div>

        <div>
          <label htmlFor="decision_maker_phone" className="mb-1.5 block text-sm font-medium text-white">
            Decision Maker Phone
          </label>
          <input
            id="decision_maker_phone"
            type="tel"
            value={formData.decision_maker_phone}
            onChange={(e) => updateField('decision_maker_phone', e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
            placeholder="+1 234 567 8900"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white">Team Members</label>
          <button
            type="button"
            onClick={addTeamMember}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-orange)] hover:text-[var(--orange-600)]"
          >
            <span className="text-lg leading-none">+</span> Add Member
          </button>
        </div>

        {(formData.team_members || []).map((member, index) => (
          <div key={index} className="mb-4 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] p-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Name</label>
              <input
                type="text"
                value={member.name}
                onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="Team member name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Role</label>
              <input
                type="text"
                value={member.role}
                onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="Role"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Email</label>
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => updateTeamMember(index, 'email', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="Email"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTeamMember(index)}
                className="text-red-400 hover:text-red-300 pb-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {(formData.team_members || []).length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No team members added yet.</p>
        )}
      </div>
    </div>
  )
}