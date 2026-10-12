// src/components/client-portal/ProjectRequestForm.tsx
//
// Project request form. Submission behaviour is UNCHANGED (Phase 18.7 is presentation + copy):
// the same validation, the same three writes (project_requests insert, projects insert,
// request -> project link), the same failure messages and the same redirect to /client-portal/projects.
//
// The form collects ONLY what the flow persists: title, service and description. (Business name,
// timeline, priority and budget were removed in Phase 18.7 because this flow never stored them.)
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClientComponentClient } from '@/lib/supabase-client'
import styles from './support.module.css'

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
  // Non-blocking notice shown on the success screen when the project was
  // created but could not be linked back to its originating request row.
  const [linkWarning, setLinkWarning] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    project_title: '',
    service_needed: '',
    description: '',
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
      // 1. Insert the project request. Only the columns that actually exist
      // on project_requests are written (id, client_id, project_id, title,
      // description, status, created_at). Service is captured on the projects
      // row below.
      const { data: requestRow, error: requestError } = await supabase
        .from('project_requests')
        .insert({
          client_id: clientId,
          title: formData.project_title,
          description: formData.description,
          status: 'open',
        })
        .select('id')
        .single()

      if (requestError || !requestRow) {
        console.error('❌ Request error:', requestError)
        throw new Error(requestError?.message || 'Failed to create request')
      }

      // 2. Create the project record. Every column here exists on projects.
      const projectId = `PROJ-${Date.now().toString().slice(-6)}`

      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          project_id: projectId,
          // `projects` is a shared table whose portfolio side uses `title`,
          // which is NOT NULL. The client-portal side reads `project_name`.
          // Write both (same value) so the required column is satisfied and
          // the admin/portal project lists render correctly.
          title: formData.project_title,
          project_name: formData.project_title,
          status: 'Pending Review',
          progress: 0,
          description: formData.description,
          service_selected: formData.service_needed,
          start_date: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (projectError || !projectRow) {
        console.error('❌ Project creation error:', projectError)
        // The request row was saved, but the project — the thing the client
        // actually needs — was not. Surface this as an error and do NOT show
        // the success screen or redirect: reporting a clean success here
        // would be false.
        setError(
          'Your request was saved, but we could not create the project record. Please contact support so we can finish setting it up.',
        )
        setLoading(false)
        return
      }

      // 3. Link the request back to its project. project_requests.project_id
      // is a real column; this is a best-effort association.
      const { error: linkError } = await supabase
        .from('project_requests')
        .update({ project_id: projectRow.id })
        .eq('id', requestRow.id)

      if (linkError) {
        // The project exists and is fully usable (visible in the portal and
        // to the admin) — only the back-reference on the request row is
        // missing. Keep the project, but tell the client the truth rather
        // than claim the whole workflow completed cleanly.
        console.error('⚠️ Request→project link error:', linkError)
        setLinkWarning(
          'Your project was created, but we could not link it to your original request. This does not affect the project itself.',
        )
      }

      setSuccess(true)
      if (onSuccess) onSuccess()

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/client-portal/projects')
      }, 2000)

    } catch (err) {
      console.error('❌ Request error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.center} role="status">
        <div className={styles.centerBody}>
          <span className={styles.tick} aria-hidden="true">
            <Check strokeWidth={2.5} />
          </span>
          <h2>Request received</h2>
          <p>
            Your project has been added to your portal with the status <strong>Pending Review</strong>. Hbee will review it from there.
          </p>
          {linkWarning && <p className={styles.warn}>{linkWarning}</p>}
          <Link href="/client-portal/projects" className={styles.secondary}>
            Go to your projects
          </Link>
          <p className={styles.hint}>Taking you to your projects…</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate={false}>
      {error && (
        <div role="alert" className={styles.err}>
          {error}
        </div>
      )}

      {/* Step 1: Project details */}
      <section className={styles.fields} aria-labelledby="pr-step-1">
        <div className={styles.stepHead}>
          <span className={styles.stepNo}>1</span>
          <h3 id="pr-step-1" className={styles.h2} style={{ marginTop: 0 }}>
            Project details
          </h3>
        </div>
        <div className={styles.field}>
          <label htmlFor="pr-title" className={styles.label}>
            Project title <span className={styles.req}>*</span>
          </label>
          <input
            id="pr-title"
            type="text"
            name="project_title"
            value={formData.project_title}
            onChange={handleChange}
            className={styles.input}
            placeholder="e.g., Ecommerce website redesign"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="pr-service" className={styles.label}>
            Service needed <span className={styles.req}>*</span>
          </label>
          <select id="pr-service" name="service_needed" value={formData.service_needed} onChange={handleChange} className={styles.select} required>
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="pr-description" className={styles.label}>
            Project description <span className={styles.req}>*</span>
          </label>
          <textarea
            id="pr-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={styles.textarea}
            placeholder="Briefly describe what you need…"
            required
          />
        </div>
      </section>

      {/* Step 2: Review & submit — only values that are actually submitted */}
      <section className={styles.fields} aria-labelledby="pr-step-2">
        <div className={styles.stepHead}>
          <span className={styles.stepNo}>2</span>
          <h3 id="pr-step-2" className={styles.h2} style={{ marginTop: 0 }}>
            Review &amp; submit
          </h3>
        </div>
        <dl className={styles.summary}>
          <div>
            <dt>Project</dt>
            <dd>{formData.project_title || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{formData.service_needed || 'Not selected'}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{formData.description.trim() ? (formData.description.trim().length > 140 ? formData.description.trim().slice(0, 139) + '…' : formData.description.trim()) : 'Not provided'}</dd>
          </div>
        </dl>
        <p className={styles.sub}>When you submit, the project is added to your portal with the status Pending Review.</p>
        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.primary}>
            {loading ? 'Submitting…' : 'Submit project request'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={styles.secondary}>
              Cancel
            </button>
          )}
        </div>
      </section>
    </form>
  )
}
