'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { filterInquiries, inquiryCounts, inquiryPreview, type Inquiry, type InquiryFilter } from '@/lib/admin/inquiries'
import {
  AdminButton,
  AdminCallout,
  AdminEmptyState,
  AdminErrorState,
  AdminFacts,
  AdminFilterGroup,
  AdminLoadingState,
  AdminNotice,
  AdminPageHeader,
  AdminSearchField,
  AdminSection,
  AdminStatusBadge,
  AdminToolbar,
  adminBtn,
} from '@/components/admin/ui/AdminUi'

/**
 * Inquiries (Phase A2): the public Contact form's submissions. Presentation only: the data access is exactly
 * what it was (a browser read of contact_submissions, an is_read update, a delete). The known contact_submissions
 * RLS concern is a separate security task and is deliberately NOT changed here.
 *
 * contact_submissions stores no merchant or client identifier, so an inquiry is never linked to a business or
 * client record: matching on name or email would be a guess, not a stored relationship.
 */

const formatWhen = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InquiriesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Inquiry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InquiryFilter>('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })
    if (error) {
      // A failed read must never look like an empty inbox.
      setLoadError('Could not load inquiries. Please refresh and try again.')
      setMessages([])
    } else {
      setLoadError(null)
      setMessages((data as Inquiry[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/admin/login')
      await fetchMessages()
    }
    void init()
  }, [router, fetchMessages])

  const selected = messages.find((m) => m.id === selectedId) || null
  const counts = inquiryCounts(messages)
  const visible = filterInquiries(messages, { filter, query })

  async function markAsRead(id: string) {
    setBusy(true)
    setNotice(null)
    const { error } = await supabase.from('contact_submissions').update({ is_read: true }).eq('id', id)
    if (error) setNotice({ tone: 'error', text: 'Could not mark this inquiry as read.' })
    else setMessages((current) => current.map((m) => (m.id === id ? { ...m, is_read: true } : m)))
    setBusy(false)
  }

  async function deleteMessage(message: Inquiry) {
    if (!confirm(`Delete the inquiry from ${message.full_name || 'this sender'}? This cannot be undone.`)) return
    setBusy(true)
    setNotice(null)
    const { error } = await supabase.from('contact_submissions').delete().eq('id', message.id)
    if (error) {
      setNotice({ tone: 'error', text: 'Could not delete this inquiry.' })
    } else {
      setMessages((current) => current.filter((m) => m.id !== message.id))
      setSelectedId(null)
      setNotice({ tone: 'success', text: 'Inquiry deleted.' })
    }
    setBusy(false)
  }

  if (loading) return <AdminLoadingState label="Loading inquiries…" />
  if (loadError) return <AdminErrorState title="Could not load inquiries" message={loadError} onRetry={() => { setLoading(true); void fetchMessages() }} />

  const filters = [
    { key: 'all' as const, label: 'All', count: counts.all },
    { key: 'unread' as const, label: 'Unread', count: counts.unread },
    { key: 'read' as const, label: 'Read', count: counts.read },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Inbox" title="Inquiries" description="Messages sent through the public Contact form." />

      {notice && <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>}

      {counts.unread > 0 ? (
        <AdminCallout tone="attention" title={`${counts.unread} unread ${counts.unread === 1 ? 'inquiry' : 'inquiries'}`}>
          Open an inquiry to read it, reply by email, and mark it as read when you have dealt with it.
        </AdminCallout>
      ) : counts.all > 0 ? (
        <AdminCallout tone="good" title="You are up to date">Every inquiry has been marked as read.</AdminCallout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* List. On phones it gives way to the detail while one is open. */}
        <div className={`min-w-0 space-y-3 ${selected ? 'hidden lg:block' : ''}`}>
          <AdminToolbar>
            <AdminSearchField label="Search inquiries" value={query} onChange={setQuery} placeholder="Search name, email, company or message" />
            <AdminFilterGroup label="Filter inquiries" options={filters} value={filter} onChange={setFilter} />
          </AdminToolbar>

          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="No inquiries yet" description="Messages sent through the Contact form appear here." />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="Nothing matches" description="Try a different search or filter." action={<AdminButton variant="secondary" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</AdminButton>} />
            </div>
          ) : (
            <ul aria-label="Inquiries" className="space-y-2">
              {visible.map((msg) => (
                <li key={msg.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(msg.id); setNotice(null) }}
                    aria-current={selectedId === msg.id ? 'true' : undefined}
                    className={`block w-full rounded-xl border p-4 text-left transition ${selectedId === msg.id ? 'border-[var(--accent)] bg-[var(--bg-section)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)]'}`}
                    style={!msg.is_read ? { borderLeft: '4px solid var(--ad-signal)' } : undefined}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate font-bold text-[var(--text-primary)]">{msg.full_name || 'Anonymous'}</span>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">{new Date(msg.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[var(--text-secondary)]">{[msg.company, msg.email].filter(Boolean).join(' · ')}</span>
                    <span className="mt-1.5 line-clamp-2 block text-sm text-[var(--text-muted)]">{inquiryPreview(msg.message)}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {!msg.is_read && <AdminStatusBadge tone="orange" dot>Unread</AdminStatusBadge>}
                      {msg.service && <AdminStatusBadge>{msg.service}</AdminStatusBadge>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className={`min-w-0 ${selected ? '' : 'hidden lg:block'}`}>
          {selected ? (
            <div className="space-y-4 lg:sticky lg:top-0">
              <div className="lg:hidden">
                <button type="button" onClick={() => setSelectedId(null)} className={adminBtn('ghost', 'sm')}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to inbox
                </button>
              </div>
              <AdminSection
                title={selected.full_name || 'Anonymous'}
                description={formatWhen(selected.created_at)}
                actions={<AdminStatusBadge tone={selected.is_read ? 'neutral' : 'orange'} dot>{selected.is_read ? 'Read' : 'Unread'}</AdminStatusBadge>}
              >
                <div className="space-y-6">
                  <AdminFacts
                    items={[
                      { label: 'Email', value: selected.email, href: selected.email ? `mailto:${selected.email}` : undefined },
                      { label: 'Phone', value: selected.phone },
                      { label: 'Company', value: selected.company },
                      { label: 'Website', value: selected.website, href: /^https?:\/\//i.test(selected.website || '') ? selected.website || undefined : undefined, external: true },
                      { label: 'About', value: selected.service },
                      { label: 'Budget', value: selected.budget },
                      { label: 'Timeline', value: selected.timeline },
                    ].filter((f) => f.value || ['Email', 'About'].includes(f.label))}
                  />
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Message</h3>
                    <p className="whitespace-pre-line break-words rounded-xl bg-[var(--bg-section)] p-4 text-sm leading-relaxed text-[var(--text-primary)]">{selected.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                    <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Response to your inquiry about ${selected.service || 'your project'}`)}`} className={adminBtn('primary')}>
                      <Mail aria-hidden="true" className="h-4 w-4" /> Reply by email
                    </a>
                    {!selected.is_read && (
                      <button type="button" onClick={() => markAsRead(selected.id)} disabled={busy} className={adminBtn('secondary')}>Mark as read</button>
                    )}
                    <button type="button" onClick={() => deleteMessage(selected)} disabled={busy} className={`${adminBtn('danger')} sm:ml-auto`}>Delete</button>
                  </div>
                </div>
              </AdminSection>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="Select an inquiry" description="Choose a message from the list to read it and reply." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
