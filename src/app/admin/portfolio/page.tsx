'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { newPortfolioPayload, portfolioEditHref, portfolioPublicHref, portfolioErrorMessage, slugify, validWorkSlug } from '@/lib/admin/portfolio-editor'
import { AdminButton, AdminEmptyState, AdminLoadingState, AdminNotice, AdminPageHeader, AdminSection, AdminStatusBadge, adminBtn } from '@/components/admin/ui/AdminUi'

type PortfolioItem = {
  id: string
  title: string
  client_name: string
  slug: string
  category: string
  image_url: string
  featured: boolean
  is_active: boolean
  display_order: number
  // Present only once the creative / case-study migrations exist; absent means "not classified yet".
  engagement_type?: string | null
  project_status?: string | null
  is_case_study?: boolean | null
}

type Filter = 'all' | 'visible' | 'hidden' | 'featured' | 'case'

const inputClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:border-[var(--accent)]'

/** Classification chips. Only what the row actually says: never a default presented as a fact. */
function Classification({ item }: { item: PortfolioItem }) {
  return (
    <>
      <AdminStatusBadge tone={item.is_active ? 'green' : 'neutral'} dot>{item.is_active ? 'Visible' : 'Hidden'}</AdminStatusBadge>
      {item.featured && <AdminStatusBadge tone="orange">Featured</AdminStatusBadge>}
      {item.is_case_study === true && <AdminStatusBadge tone="dark">Case Study</AdminStatusBadge>}
      {item.is_case_study === false && <AdminStatusBadge>Standard Work</AdminStatusBadge>}
      {item.engagement_type === 'client' && <AdminStatusBadge tone="blue">Client</AdminStatusBadge>}
      {item.engagement_type === 'studio_team' && <AdminStatusBadge>Studio</AdminStatusBadge>}
      {item.project_status === 'ongoing' && <AdminStatusBadge tone="amber">Ongoing</AdminStatusBadge>}
      {item.project_status === 'completed' && <AdminStatusBadge>Completed</AdminStatusBadge>}
    </>
  )
}

export default function AdminPortfolioPage() {
  const router = useRouter()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { void fetchItems() }, [])

  async function fetchItems() {
    try {
      const { data, error } = await supabase.from('portfolio_items').select('*').order('display_order', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to load portfolio items.'))
    } finally { setLoading(false) }
  }

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setErrorMessage('')
    try {
      const payload = newPortfolioPayload(title, slug)
      const { data, error } = await supabase.from('portfolio_items').insert([payload]).select('id').single()
      if (error) throw error
      setShowCreate(false)
      setTitle('')
      setSlug('')
      setMessage('Draft created. Opening the full editor…')
      router.push(portfolioEditHref(data.id))
      await fetchItems()
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to create the portfolio item.'))
    } finally { setBusy(false) }
  }

  async function manageItem(id: string, changes: Partial<Pick<PortfolioItem, 'featured' | 'is_active' | 'display_order'>>) {
    if (busy) return
    setBusy(true)
    setErrorMessage('')
    setMessage('')
    try {
      const { error } = await supabase.from('portfolio_items').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      await fetchItems()
      setMessage('Portfolio settings saved.')
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to save portfolio settings.'))
    } finally { setBusy(false) }
  }

  async function deleteItem(id: string) {
    if (busy || !confirm('Delete this portfolio item permanently?')) return
    setBusy(true)
    setErrorMessage('')
    setMessage('')
    try {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
      if (error) throw error
      await fetchItems()
      setMessage('Portfolio item deleted.')
    } catch (error) {
      setErrorMessage(portfolioErrorMessage(error, 'Unable to delete the portfolio item.'))
    } finally { setBusy(false) }
  }

  const hasCaseStudies = items.some((item) => item.is_case_study === true)
  const needle = query.trim().toLowerCase()
  const visibleItems = items.filter((item) => {
    if (filter === 'visible' && !item.is_active) return false
    if (filter === 'hidden' && item.is_active) return false
    if (filter === 'featured' && !item.featured) return false
    if (filter === 'case' && item.is_case_study !== true) return false
    return !needle || [item.title, item.client_name, item.category, item.slug].some((value) => (value || '').toLowerCase().includes(needle))
  })

  const filters: Array<[Filter, string, number]> = [
    ['all', 'All', items.length],
    ['visible', 'Visible', items.filter((i) => i.is_active).length],
    ['hidden', 'Hidden', items.filter((i) => !i.is_active).length],
    ['featured', 'Featured', items.filter((i) => i.featured).length],
    ...(hasCaseStudies ? ([['case', 'Case Studies', items.filter((i) => i.is_case_study === true).length]] as Array<[Filter, string, number]>) : []),
  ]

  const header = (
    <AdminPageHeader
      eyebrow="Website content"
      title="Portfolio & Case Studies"
      description="Manage the public /work entries. Open a project to edit its story, media, classification and SEO."
    >
      <button type="button" disabled={busy} onClick={() => { setShowCreate(true); setMessage(''); setErrorMessage('') }} className={adminBtn('primary')}>
        <Plus aria-hidden="true" className="h-4 w-4" />Create New Project
      </button>
    </AdminPageHeader>
  )

  if (loading) return <div className="space-y-6">{header}<AdminLoadingState label="Loading portfolio…" /></div>

  return (
    <div className="space-y-6">
      {header}
      {message && <AdminNotice tone="success">{message}</AdminNotice>}
      {errorMessage && <AdminNotice tone="error">{errorMessage}</AdminNotice>}

      {showCreate && (
        <AdminSection id="create-portfolio" title="Create a draft" description="Start with a title and URL. Add the remaining details in the full editor before making it visible.">
          <form onSubmit={createItem} className="space-y-4">
            <fieldset disabled={busy} className="grid gap-5 lg:grid-cols-2">
              <label className="text-sm font-bold text-[var(--text-secondary)]">Project title *
                <input required value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)) }} className={`mt-1.5 ${inputClass}`} />
              </label>
              <label className="text-sm font-bold text-[var(--text-secondary)]">Slug *
                <input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} pattern="[a-z0-9_]+(-[a-z0-9_]+)*" aria-describedby="create-slug-hint" className={`mt-1.5 ${inputClass}`} />
                <span id="create-slug-hint" className="mt-1 block text-xs font-normal text-[var(--text-muted)]">URL: /work/{slug || '…'}{slug === 'portfolio' ? ' — “portfolio” is reserved' : ''}</span>
              </label>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy || !title.trim() || !validWorkSlug(slug)} className={adminBtn('primary')}>{busy ? 'Creating…' : 'Create draft'}</button>
              <button type="button" disabled={busy} onClick={() => setShowCreate(false)} className={adminBtn('secondary')}>Cancel</button>
            </div>
          </form>
        </AdminSection>
      )}

      <section aria-label="Portfolio projects" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <span className="sr-only">Search projects</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, client, category or URL" className={`${inputClass} pl-9`} />
          </label>
          <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-1.5">
            {filters.map(([key, label, total]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={adminBtn(filter === key ? 'accent' : 'secondary', 'sm')}>
                {label} <span className="opacity-70">{total}</span>
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
            <AdminEmptyState title="No projects yet" description="Create your first draft to start building the public Work portfolio." action={<AdminButton variant="primary" onClick={() => { setShowCreate(true); setMessage(''); setErrorMessage('') }}>Start a draft</AdminButton>} />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
            <AdminEmptyState title="No projects match" description="Try a different search or filter." action={<AdminButton variant="secondary" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</AdminButton>} />
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]" role="status">Showing {visibleItems.length} of {items.length}. Lower display order appears first within featured and non-featured groups.</p>
            <ul className="grid gap-4 xl:grid-cols-2">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] sm:flex-row">
                    <div className="aspect-[16/9] w-full flex-none bg-[var(--bg-section)] sm:aspect-auto sm:w-44">
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                        : <div aria-hidden="true" className="grid h-full w-full place-items-center text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">No image</div>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="break-words text-base font-extrabold leading-snug text-[var(--text-primary)]">{item.title || item.client_name}</h3>
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{item.category || 'Uncategorized'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5"><Classification item={item} /></div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link href={portfolioEditHref(item.id)} className={adminBtn('accent', 'sm')}>Edit</Link>
                        {validWorkSlug(item.slug) && item.is_active && <Link href={portfolioPublicHref(item.slug)} target="_blank" rel="noopener noreferrer" className={adminBtn('secondary', 'sm')}>View /work page</Link>}
                        <button type="button" disabled={busy} onClick={() => manageItem(item.id, { featured: !item.featured })} className={adminBtn('secondary', 'sm')}>{item.featured ? 'Unfeature' : 'Feature'}</button>
                        <button type="button" disabled={busy} onClick={() => manageItem(item.id, { is_active: !item.is_active })} className={adminBtn('secondary', 'sm')}>{item.is_active ? 'Hide' : 'Show'}</button>
                      </div>
                      <details className="group text-sm">
                        <summary className="inline-flex min-h-[2rem] cursor-pointer list-none items-center font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">More options</summary>
                        <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
                          <form className="flex items-end gap-2" onSubmit={(event) => {
                            event.preventDefault()
                            const value = Number(new FormData(event.currentTarget).get('display_order'))
                            if (Number.isSafeInteger(value)) void manageItem(item.id, { display_order: value })
                          }}>
                            <label className="text-xs text-[var(--text-muted)]">Display order
                              <input key={item.display_order} name="display_order" type="number" step="1" required defaultValue={item.display_order ?? 0} disabled={busy} className={`mt-1 block w-24 ${inputClass}`} />
                            </label>
                            <button type="submit" disabled={busy} className={adminBtn('secondary', 'sm')}>Save order</button>
                          </form>
                          <button type="button" disabled={busy} onClick={() => deleteItem(item.id)} className={adminBtn('danger', 'sm')}>Delete</button>
                        </div>
                      </details>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
