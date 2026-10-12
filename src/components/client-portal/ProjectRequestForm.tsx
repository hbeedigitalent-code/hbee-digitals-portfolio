// src/components/client-portal/ProjectRequestForm.tsx
//
// Project request form. Validation, copy, success/failure semantics and the redirect to
// /client-portal/projects are unchanged. Phase 18.8: the three writes (request, Pending Review
// project, link) no longer run in the browser under RLS with a browser-supplied client_id — the form
// sends { title, service, description } to POST /api/client-portal/project-requests, which derives the
// client from the session and performs the same writes in the same order.
//
// The form collects ONLY what the flow persists: title, service and description.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { REQUEST_SERVICES } from '@/lib/client-portal/project-request'
import styles from './support.module.css'

interface ProjectRequestFormProps {
  clientName: string
  businessName: string
  email: string
  onSuccess?: () => void
  onCancel?: () => void
}

const services = REQUEST_SERVICES

export function ProjectRequestForm({
  clientName,
  businessName,
  email,
  onSuccess,
  onCancel
}: ProjectRequestFormProps) {
  const router = useRouter()
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
      // The server derives the client from the session and performs the three writes in order.
      const response = await fetch('/api/client-portal/project-requests', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.project_title,
          service: formData.service_needed,
          description: formData.description,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.ok) {
        // 'project_failed': the request row was saved but the project was not — said plainly, and
        // never reported as a success.
        setError(payload?.error || 'Failed to submit request. Please try again.')
        setLoading(false)
        return
      }

      if (payload.linkWarning) {
        // The project exists and is fully usable — only the back-reference on the request row is
        // missing. Keep the project, but tell the client the truth.
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
