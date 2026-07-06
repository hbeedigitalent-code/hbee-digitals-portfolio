// src/components/client-portal/ProjectRequestForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

interface ProjectRequestFormProps {
  clientId: string
  userId: string
  clientName: string
  businessName: string
  email: string
  onSuccess?: () => void
  onCancel?: () => void
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
  'Maintenance & Support',
  'Other'
]

const timelines = [
  'Immediate (1-2 weeks)',
  'Short term (1 month)',
  'Medium term (2-3 months)',
  'Long term (3-6 months)',
  'Flexible'
]

const priorities = [
  { value: 'Low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'Urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export function ProjectRequestForm({ 
  clientId, 
  userId, 
  clientName, 
  businessName, 
  email, 
  onSuccess, 
  onCancel 
}: ProjectRequestFormProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    project_title: '',
    business_name: businessName || '',
    service_needed: '',
    description: '',
    preferred_timeline: '',
    priority: 'Medium',
    budget_range: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate
    if (!formData.project_title?.trim()) {
      setError('Project title is required')
      setLoading(false)
      return
    }
    if (!formData.service_needed) {
      setError('Please select a service')
      setLoading(false)
      return
    }
    if (!formData.description?.trim()) {
      setError('Please describe your project')
      setLoading(false)
      return
    }

    try {
      // Generate project ID
      const projectId = `PROJ-${Date.now().toString().slice(-6)}`

      // 1. Create project request
      const { data: requestData, error: requestError } = await supabase
        .from('project_requests')
        .insert({
          client_id: clientId,
          user_id: userId,
          project_title: formData.project_title,
          business_name: formData.business_name || businessName,
          service_needed: formData.service_needed,
          description: formData.description,
          preferred_timeline: formData.preferred_timeline,
          priority: formData.priority,
          budget_range: formData.budget_range || null,
          status: 'Pending Review',
        })
        .select()
        .single()

      if (requestError) throw requestError

      // 2. Create a project record with Pending Review status
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          project_id: projectId,
          project_name: formData.project_title,
          status: 'Pending Review',
          progress: 0,
          description: formData.description,
          service_selected: formData.service_needed,
          start_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/client-portal/projects')
      }, 2000)

    } catch (err) {
      console.error('Request error:', err)
      setError('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <SvgIcon name="check" size={32} color="#16a34a" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Project Request Submitted! ✅</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Your project request has been submitted and is pending review.
        </p>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Status: <span className="font-medium text-yellow-600 dark:text-yellow-400">Pending Review</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quick Project Request</h2>
          <p className="text-sm text-[var(--text-muted)]">Submit a quick project request in 3 simple steps</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Project Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">1</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Project Details</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="project_title"
                value={formData.project_title}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., Ecommerce Website Redesign"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Business Name
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Your business name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Service Needed <span className="text-red-500">*</span>
            </label>
            <select
              name="service_needed"
              value={formData.service_needed}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Briefly describe what you need..."
              required
            />
          </div>
        </div>

        {/* Step 2: Timeline & Priority */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">2</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Timeline & Priority</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Preferred Timeline <span className="text-red-500">*</span>
              </label>
              <select
                name="preferred_timeline"
                value={formData.preferred_timeline}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                required
              >
                <option value="">Select timeline</option>
                {timelines.map((timeline) => (
                  <option key={timeline} value={timeline}>{timeline}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`rounded-lg border p-2 text-sm font-medium transition ${
                      formData.priority === p.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Budget Range (Optional)
            </label>
            <input
              type="text"
              name="budget_range"
              value={formData.budget_range}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="e.g., $5,000 - $10,000"
            />
          </div>
        </div>

        {/* Step 3: Review & Submit */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">3</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Review & Submit</h3>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Project:</span>
                <span className="font-medium text-[var(--text-primary)]">{formData.project_title || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Service:</span>
                <span className="font-medium text-[var(--text-primary)]">{formData.service_needed || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Timeline:</span>
                <span className="font-medium text-[var(--text-primary)]">{formData.preferred_timeline || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Priority:</span>
                <span className={`font-medium ${
                  formData.priority === 'Urgent' ? 'text-red-500' :
                  formData.priority === 'High' ? 'text-orange-500' :
                  formData.priority === 'Medium' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {formData.priority || 'Medium'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Project Request'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}