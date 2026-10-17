'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { newPortfolioPayload, portfolioEditHref, portfolioPublicHref, portfolioErrorMessage, slugify, validWorkSlug } from '@/lib/admin/portfolio-editor'

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
}

const inputClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)]'
const actionClass = 'rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50'

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

  if (loading) return <p className="py-20 text-center text-[var(--text-muted)]" role="status">Loading portfolio…</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Portfolio &amp; Case Studies</h2>
          <p className="text-sm text-[var(--text-muted)]">Manage public /work entries. Open Edit for the full story, media and SEO controls.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => { setShowCreate(true); setMessage(''); setErrorMessage('') }} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-white disabled:opacity-50">Create New Project</button>
      </div>
      {message && <p role="status" className="rounded-xl border border-[var(--accent)]/20 p-4 text-sm text-[var(--accent)]">{message}</p>}
      {errorMessage && <p role="alert" className="rounded-xl border border-red-500/20 p-4 text-sm text-red-500">{errorMessage}</p>}

      {showCreate && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6" aria-labelledby="create-portfolio-title">
          <h3 id="create-portfolio-title" className="text-lg font-black text-[var(--text-primary)]">Create a draft</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Start with a title and URL. Add the remaining details in the full editor before making it visible.</p>
          <form onSubmit={createItem} className="mt-5 space-y-4">
            <fieldset disabled={busy} className="grid gap-5 lg:grid-cols-2">
              <label className="text-sm font-bold text-[var(--text-secondary)]">Project title *
                <input required value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)) }} className={inputClass} />
              </label>
              <label className="text-sm font-bold text-[var(--text-secondary)]">Slug *
                <input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} pattern="[a-z0-9_]+(-[a-z0-9_]+)*" aria-describedby="create-slug-hint" className={inputClass} />
                <span id="create-slug-hint" className="mt-1 block text-xs font-normal text-[var(--text-muted)]">URL: /work/{slug || '…'}{slug === 'portfolio' ? ' — “portfolio” is reserved; choose another slug.' : ''}</span>
              </label>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy || !title.trim() || !validWorkSlug(slug)} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create draft & continue'}</button>
              <button type="button" disabled={busy} onClick={() => setShowCreate(false)} className={actionClass}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6" aria-labelledby="portfolio-items-title">
        <h3 id="portfolio-items-title" className="mb-2 text-lg font-black text-[var(--text-primary)]">Existing Portfolio Items</h3>
        <p className="mb-5 text-sm text-[var(--text-muted)]">Lower display order appears first within featured and non-featured groups. Public loaders show featured entries first.</p>
        {items.length === 0 ? <p className="py-8 text-center text-[var(--text-muted)]">No portfolio items loaded.</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
                <div className="flex gap-4">
                  {item.image_url && <img src={item.image_url} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-[var(--bg-card)] object-contain" />}
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words font-bold text-[var(--text-primary)]">{item.title || item.client_name}</h4>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{item.category || 'Uncategorized'} · {item.is_active ? 'Visible' : 'Hidden'}{item.featured ? ' · Featured' : ''}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={portfolioEditHref(item.id)} className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-black text-white">Edit</Link>
                      {validWorkSlug(item.slug) && item.is_active && <Link href={portfolioPublicHref(item.slug)} target="_blank" rel="noopener noreferrer" className={actionClass}>View /work page</Link>}
                      <button type="button" disabled={busy} onClick={() => manageItem(item.id, { featured: !item.featured })} className={actionClass}>{item.featured ? 'Unfeature' : 'Feature'}</button>
                      <button type="button" disabled={busy} onClick={() => manageItem(item.id, { is_active: !item.is_active })} className={actionClass}>{item.is_active ? 'Hide' : 'Make visible'}</button>
                      <button type="button" disabled={busy} onClick={() => deleteItem(item.id)} className="rounded-full border border-red-500/30 px-3 py-2 text-xs font-bold text-red-500 disabled:opacity-50">Delete</button>
                    </div>
                    <form className="mt-3 flex items-end gap-2" onSubmit={(event) => {
                      event.preventDefault()
                      const value = Number(new FormData(event.currentTarget).get('display_order'))
                      if (Number.isSafeInteger(value)) void manageItem(item.id, { display_order: value })
                    }}>
                      <label className="text-xs text-[var(--text-muted)]">Display order
                        <input key={item.display_order} name="display_order" type="number" step="1" required defaultValue={item.display_order ?? 0} disabled={busy} className={`${inputClass} mt-1 max-w-28`} />
                      </label>
                      <button type="submit" disabled={busy} className={actionClass}>Save order</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
