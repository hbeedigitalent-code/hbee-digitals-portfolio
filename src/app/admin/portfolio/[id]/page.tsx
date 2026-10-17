'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import PortfolioGallery from '@/components/admin/PortfolioGallery'
import PortfolioCreativeMedia from '@/components/admin/PortfolioCreativeMedia'
import { portfolioCreativeEnabled } from '@/lib/portfolio-creative'
import {
  EMPTY_PORTFOLIO, loadPortfolioEditor, portfolioPayload, portfolioPublicHref, portfolioErrorMessage, slugify,
  validatePortfolio, validPortfolioImage, validWorkSlug, type PortfolioEditor, type PortfolioErrors,
} from '@/lib/admin/portfolio-editor'

const inputClass = 'mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)]'
const actionClass = 'rounded-full border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] disabled:opacity-50'
type TextKey = { [K in keyof PortfolioEditor]: PortfolioEditor[K] extends string ? K : never }[keyof PortfolioEditor]

function Field({ name, label, value, onChange, error, hint, rows, required, type = 'text' }: {
  name: string; label: string; value: string; onChange: (value: string) => void
  error?: string; hint?: string; rows?: number; required?: boolean; type?: string
}) {
  const props = { id: `portfolio-${name}`, value, required, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value), className: inputClass, 'aria-invalid': Boolean(error), 'aria-describedby': error || hint ? `portfolio-${name}-help` : undefined }
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-black text-[var(--text-secondary)]">{label}{required ? ' *' : ''}</label>
      {rows ? <textarea {...props} rows={rows} /> : <input {...props} type={type} />}
      {(error || hint) && <p id={`portfolio-${name}-help`} className={`mt-1 text-xs ${error ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>{error || hint}</p>}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"><h2 id={`${id}-title`} className="mb-5 text-xl font-black text-[var(--text-primary)]">{title}</h2><div className="space-y-5">{children}</div></section>
}

export default function EditPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [form, setForm] = useState<PortfolioEditor>(EMPTY_PORTFOLIO)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<PortfolioErrors>({})
  const [dirty, setDirty] = useState(false)
  const [savedSlug, setSavedSlug] = useState('')
  const [savedActive, setSavedActive] = useState(false)
  const [technologiesText, setTechnologiesText] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoaded(false)
    setErrorMessage('')
    async function fetchItem() {
      try {
        const { data, error } = await supabase.from('portfolio_items').select('*').eq('id', id).single()
        if (error) throw error
        if (!data) throw new Error('Portfolio item not found.')
        const next = loadPortfolioEditor(data)
        if (!cancelled) {
          setForm(next)
          setTechnologiesText(next.technologies_used.join('\n'))
          setSavedSlug(next.slug)
          setSavedActive(next.is_active)
          setDirty(false)
          setLoaded(true)
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(portfolioErrorMessage(error, 'Unable to load this portfolio item. No changes have been saved.'))
      } finally { if (!cancelled) setLoading(false) }
    }
    if (id) void fetchItem()
    return () => { cancelled = true }
  }, [id])

  function updateField<K extends keyof PortfolioEditor>(key: K, value: PortfolioEditor[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setMessage('')
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !loaded) return
    const validation = validatePortfolio(form)
    setErrors(validation)
    setMessage('')
    if (Object.keys(validation).length) { setErrorMessage('Check the highlighted fields before saving.'); return }
    setSaving(true)
    setErrorMessage('')
    try {
      const payload = { ...portfolioPayload(form), updated_at: new Date().toISOString() }
      const { data, error } = await supabase.from('portfolio_items').update(payload).eq('id', id).select('id').single()
      if (error) throw error
      if (!data) throw new Error('The item was not saved. Reload and try again.')
      setDirty(false)
      setSavedSlug(form.slug)
      setSavedActive(form.is_active)
      setMessage('Portfolio item saved. Public pages may take time to refresh.')
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to save this portfolio item.'))
    } finally { setSaving(false) }
  }

  async function deleteItem() {
    if (saving || !confirm('Delete this portfolio item permanently?')) return
    setSaving(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
      if (error) throw error
      router.push('/admin/portfolio')
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to delete this portfolio item.'))
    } finally { setSaving(false) }
  }

  function field(key: TextKey, label: string, options: { hint?: string; rows?: number; required?: boolean; type?: string } = {}) {
    return <Field name={key} label={label} value={form[key]} onChange={(value) => updateField(key, key === 'slug' ? slugify(value) : value)} error={errors[key]} {...options} />
  }

  if (loading) return <p role="status" className="py-20 text-center text-[var(--text-muted)]">Loading portfolio item…</p>
  if (!loaded) return <div className="space-y-5"><p role="alert" className="text-red-500">{errorMessage}</p><Link href="/admin/portfolio" className={actionClass}>Back to portfolio</Link></div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-[var(--accent)]">Admin / Portfolio / Edit</p>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Edit Portfolio Item</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Manage the existing public work entry, story, images and SEO.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {savedActive && validWorkSlug(savedSlug) && <Link href={portfolioPublicHref(savedSlug)} target="_blank" rel="noopener noreferrer" className={actionClass}>View saved /work page</Link>}
          <Link href="/admin/portfolio" className={actionClass}>Back to portfolio</Link>
        </div>
      </div>
      <nav aria-label="Portfolio editor sections" className="flex flex-wrap gap-4 text-sm font-bold text-[var(--accent)]">
        {['basics', 'story', 'media', 'visibility', 'seo'].map((section) => <a key={section} href={`#${section}`} className="capitalize underline underline-offset-4">{section}</a>)}
      </nav>
      {message && <p role="status" className="rounded-xl border border-[var(--accent)]/20 p-4 text-sm text-[var(--accent)]">{message}</p>}
      {errorMessage && <p role="alert" className="rounded-xl border border-red-500/20 p-4 text-sm text-red-500">{errorMessage}</p>}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <fieldset disabled={saving} className="min-w-0 space-y-6">
          <Section id="basics" title="Basics">
            <div className="grid gap-5 lg:grid-cols-2">
              {field('title', 'Project title', { required: true })}
              {field('client_name', 'Client name', { hint: 'Shown as the client; the project title is used when this is blank.' })}
              {field('slug', 'Slug', { required: true, hint: `URL: /work/${form.slug || '…'}. Changing a saved slug changes its public URL; no redirect is created here.` })}
              {field('category', 'Category', { hint: 'Free-text grouping on /work. No capability assignment.' })}
              {field('industry', 'Industry', { hint: 'Free text. Used as a category fallback when category is blank.' })}
              {field('project_type', 'Project type', { hint: 'Displayed as entered; this does not assign Hbee capabilities.' })}
            </div>
            {field('description', 'Short description', { rows: 3 })}
            <Field name="technologies_used" label="Technologies used" rows={4} value={technologiesText} onChange={(value) => {
              setTechnologiesText(value)
              updateField('technologies_used', value.split('\n').map((item) => item.trim()).filter(Boolean))
            }} hint="One per line. These labels appear on homepage Selected Work (up to three); they are not verified Hbee service or capability assignments." />
          </Section>

          <Section id="story" title="Story">
            <p className="text-sm text-[var(--text-muted)]">Plain text is used publicly; markup is stripped. Empty optional sections are omitted.</p>
            {field('brief', 'Project context / brief', { rows: 4, hint: 'Shown as context when it adds to the short description.' })}
            {field('challenge', 'Challenge', { rows: 4, hint: 'Shown as “The challenge” and used first for homepage project context.' })}
            {field('solution', 'Solution', { rows: 4 })}
            {field('results_summary', 'Public results summary (primary)', { rows: 4, hint: 'This takes precedence over legacy results below. Edit this field to change an existing public summary. Unsupported numeric claims are suppressed publicly.' })}
            {field('results', 'Legacy results (fallback)', { rows: 4, hint: 'Shown only when the primary summary has no public text. To remove the public outcome entirely, clear both fields. Existing stored values are preserved unless you edit them.' })}
          </Section>

          <Section id="media" title="Media">
            <p className="text-sm text-[var(--text-muted)]">Use existing HTTPS image URLs, local /paths, or the existing public image uploader. Uploads use the project-images bucket.</p>
            <p className="text-sm text-[var(--text-muted)]">If the main image is blank, the public page retains its existing featured-image / after-image fallback. This editor leaves any legacy featured image untouched.</p>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <ImageUpload key={`cover-${form.image_url}`} label="Upload main / cover image" currentImage={validPortfolioImage(form.image_url) ? form.image_url : ''} folder="portfolio" contain onUpload={(url) => updateField('image_url', url)} />
                {field('image_url', 'Main / cover image URL')}
              </div>
              <div className="space-y-4">
                <ImageUpload key={`before-${form.before_image}`} label="Upload before image" currentImage={validPortfolioImage(form.before_image) ? form.before_image : ''} folder="portfolio-before-after" contain onUpload={(url) => updateField('before_image', url)} />
                {field('before_image', 'Before image URL')}
              </div>
              <div className="space-y-4">
                <ImageUpload key={`after-${form.after_image}`} label="Upload after image" currentImage={validPortfolioImage(form.after_image) ? form.after_image : ''} folder="portfolio-before-after" contain onUpload={(url) => updateField('after_image', url)} />
                {field('after_image', 'After image URL')}
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">The public comparison requires two distinct images, with neither already used as the cover. An unpaired before image is omitted.</p>
            <h3 className="text-lg font-black text-[var(--text-primary)]">Gallery images</h3>
            <PortfolioGallery images={form.gallery_images} onChange={(images) => updateField('gallery_images', images)} />
            {errors.gallery_images && <p role="alert" className="text-sm text-red-500">{errors.gallery_images}</p>}
          </Section>

          <Section id="visibility" title="Visibility & ordering">
            <div className="grid gap-5 lg:grid-cols-2">
              {field('website_url', 'Website URL (optional)', { type: 'url', hint: 'Use HTTPS. Leave blank to omit the external website link when no legacy URL fallback is stored.' })}
              <Field name="display_order" label="Display order" value={String(form.display_order)} type="number" error={errors.display_order} hint="Lower numbers appear first within featured and non-featured groups." onChange={(value) => updateField('display_order', value.trim() === '' ? NaN : Number(value))} />
            </div>
            <div className="flex flex-wrap gap-5">
              {(['featured', 'is_active', 'is_before_after'] as const).map((key) => <label key={key} className="flex items-center gap-3 text-sm font-bold text-[var(--text-secondary)]"><input type="checkbox" checked={form[key]} onChange={(e) => updateField(key, e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />{key === 'featured' ? 'Featured' : key === 'is_active' ? 'Active / publicly visible' : 'Legacy before/after flag'}</label>)}
            </div>
            <p className="text-sm text-[var(--text-muted)]">Featured entries appear first. Visibility controls public inclusion. The legacy before/after flag is preserved; /work uses the actual image pair.</p>
            <details className="rounded-xl border border-[var(--border)] p-4">
              <summary className="cursor-pointer text-sm font-bold text-[var(--text-secondary)]">Homepage result label</summary>
              <p className="my-3 text-sm text-[var(--text-muted)]">Existing homepage metric fields. Enter evidence-backed claims only; /work detail continues to suppress numeric outcome text.</p>
              <div className="grid gap-5 lg:grid-cols-2">{field('metric_value', 'Metric value')}{field('metric_label', 'Metric label')}</div>
            </details>
          </Section>

          <Section id="seo" title="SEO">
            {field('seo_title', 'SEO title', { hint: 'Optional. Falls back to the client name on the public work page.' })}
            {field('seo_description', 'SEO description', { rows: 3, hint: 'Optional. Falls back to the short description, then the existing default.' })}
          </Section>
          <Section id="creative-media" title="Creative media & capabilities">
            {portfolioCreativeEnabled() ? <PortfolioCreativeMedia portfolioId={id} disabled={saving} /> : <p className="text-sm text-[var(--text-muted)]">Typed creative assets and explicit capability assignments are awaiting the approved database rollout. The existing gallery remains available above.</p>}
          </Section>
        </fieldset>
        <div className="flex flex-wrap items-center gap-4 pb-10">
          <button type="submit" disabled={saving || !dirty} className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] disabled:opacity-50">{saving ? 'Saving…' : 'Save portfolio item'}</button>
          <span role="status" className="text-sm text-[var(--text-muted)]">{saving ? 'Saving changes…' : dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
          <button type="button" disabled={saving} onClick={deleteItem} className="rounded-full border border-red-500/30 px-5 py-3 text-sm font-bold text-red-500 disabled:opacity-50">Delete item</button>
        </div>
      </form>
    </div>
  )
}
