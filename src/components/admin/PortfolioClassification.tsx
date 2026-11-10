'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { portfolioErrorMessage } from '@/lib/admin/portfolio-editor'
import { engagementLabel, engagementTypeOf, isCaseStudy, projectStatusOf, statusLabel, type EngagementType, type ProjectStatus } from '@/lib/site/work-classification'

const option = 'flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm has-[:checked]:border-[var(--accent)]'

/**
 * Engagement type, project status and presentation type (Standard Work vs Case
 * Study). Mounted only with the creative rollout flag. Saves ONLY these columns,
 * independently of the Phase B form, so no legacy field can be touched.
 * Safe defaults: Studio work / Completed / Standard Work. Nothing is promoted to
 * a Case Study unless an editor chooses it. If the additive Case Study column is
 * not in the database yet the control says so and is not written.
 */
export default function PortfolioClassification({ portfolioId, disabled }: { portfolioId: string; disabled: boolean }) {
  const [engagement, setEngagement] = useState<EngagementType>('studio_team')
  const [status, setStatus] = useState<ProjectStatus>('completed')
  const [caseStudy, setCaseStudy] = useState(false)
  const [presentationAvailable, setPresentationAvailable] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoaded(false); setError(''); setMessage(''); setDirty(false)
    async function load() {
      try {
        let available = true
        let result = await supabase.from('portfolio_items').select('engagement_type,project_status,is_case_study').eq('id', portfolioId).single()
        if (result.error) {
          // The Case Study column may not be applied yet: retry without it rather than failing the whole control.
          available = false
          result = await supabase.from('portfolio_items').select('engagement_type,project_status').eq('id', portfolioId).single()
          if (result.error) throw result.error
        }
        const data = result.data
        if (!cancelled) {
          setEngagement(engagementTypeOf(data?.engagement_type)); setStatus(projectStatusOf(data?.project_status))
          setCaseStudy(available && isCaseStudy((data as { is_case_study?: unknown } | null)?.is_case_study))
          setPresentationAvailable(available); setLoaded(true)
        }
      } catch (e) { if (!cancelled) setError(portfolioErrorMessage(e, 'Unable to load classification. Check the approved schema rollout.')) }
    }
    void load()
    return () => { cancelled = true }
  }, [portfolioId])

  function change(apply: () => void) { apply(); setDirty(true); setMessage('') }

  async function save() {
    if (saving || disabled || !loaded || !dirty) return
    setSaving(true); setError(''); setMessage('')
    try {
      const payload = presentationAvailable
        ? { engagement_type: engagement, project_status: status, is_case_study: caseStudy }
        : { engagement_type: engagement, project_status: status }
      const { data, error } = await supabase.from('portfolio_items').update(payload).eq('id', portfolioId).select('id').single()
      if (error) throw error
      if (!data) throw new Error('Classification was not saved. Reload and try again.')
      setDirty(false)
      setMessage('Saved. Public pages may take a few minutes to refresh.')
    } catch (e) { setError(portfolioErrorMessage(e, 'Not saved. Your selection remains here.')) }
    finally { setSaving(false) }
  }

  if (!loaded) return <p role={error ? 'alert' : 'status'} className="text-sm text-[var(--text-muted)]">{error || 'Loading classification…'}</p>
  return (
    <fieldset disabled={disabled || saving} className="min-w-0 space-y-6">
      <legend className="sr-only">Engagement and presentation</legend>
      <div role="radiogroup" aria-label="Presentation type" className="space-y-3">
        <p className="text-sm font-black text-[var(--text-secondary)]">Presentation type</p>
        {([false, true] as const).map((value) => (
          <label key={String(value)} className={`${option} ${presentationAvailable ? '' : 'opacity-60'}`}>
            <input type="radio" name="presentation_type" value={value ? 'case_study' : 'standard'} checked={caseStudy === value} disabled={!presentationAvailable} onChange={() => change(() => setCaseStudy(value))} />
            <span><strong className="block text-[var(--text-primary)]">{value ? 'Case Study' : 'Standard Work'}</strong>
              <span className="text-[var(--text-muted)]">{value
                ? 'Eligible for the dedicated Case Studies library and a deeper editorial project page. Use for substantial engagements with enough context and work to tell a real story.'
                : 'Shown in the general Work portfolio with a lighter project presentation. The right choice for flyers, logos, single campaigns, small builds and selected pieces.'}</span></span>
          </label>
        ))}
        {!presentationAvailable && <p role="status" className="text-sm text-[var(--text-muted)]">Presentation type is not available yet: the Case Study database change has not been applied to this environment. Every project stays Standard Work until it is.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div role="radiogroup" aria-label="Engagement type" className="space-y-3">
          <p className="text-sm font-black text-[var(--text-secondary)]">Engagement type</p>
          {(['studio_team', 'client'] as const).map((value) => (
            <label key={value} className={option}>
              <input type="radio" name="engagement_type" value={value} checked={engagement === value} onChange={() => change(() => setEngagement(value))} />
              <span><strong className="block text-[var(--text-primary)]">{engagementLabel(value)}</strong>
                <span className="text-[var(--text-muted)]">{value === 'client' ? 'A real engagement for a client. The only option that allows “client” wording publicly.' : 'Studio, team or exploratory work. Never presented as a client engagement, even as a Case Study.'}</span></span>
            </label>
          ))}
        </div>
        <div role="radiogroup" aria-label="Project status" className="space-y-3">
          <p className="text-sm font-black text-[var(--text-secondary)]">Project status</p>
          {(['completed', 'ongoing'] as const).map((value) => (
            <label key={value} className={option}>
              <input type="radio" name="project_status" value={value} checked={status === value} onChange={() => change(() => setStatus(value))} />
              <span><strong className="block text-[var(--text-primary)]">{statusLabel(value)}</strong>
                <span className="text-[var(--text-muted)]">{value === 'ongoing' ? 'Public copy shows “Progress so far” and never implies final results.' : 'Public copy may present delivered work and outcomes.'}</span></span>
            </label>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={!dirty || saving} className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] disabled:opacity-50">{saving ? 'Saving…' : 'Save engagement & presentation'}</button>
        <span role="status" className="text-sm text-[var(--text-muted)]">{dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
      </div>
    </fieldset>
  )
}
