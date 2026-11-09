// src/app/admin/merchants/page.tsx
//
// Merchants (Phase A2 follow-up). Two clearly separate things used to share this name:
//   - Businesses   the `merchants` table: a business that submitted a Growth Review. This is the record the
//                  Growth Review workflow hangs off and the one the merchant detail page shows.
//   - Sign-up accounts   the `merchant_accounts` table: one row per sign-up LOGIN (id = auth user id).
// They are different tables with no stored link between them, so the page labels them apart and only ever
// connects them through stored identifiers (merchant_accounts.id = clients.user_id → clients.merchant_id), never
// by name or email. See docs/admin-merchant-architecture.md.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterGroup,
  AdminLoadingState,
  AdminPageHeader,
  AdminSearchField,
  AdminStatusBadge,
  AdminToolbar,
  adminBtn,
} from '@/components/admin/ui/AdminUi'

type View = 'businesses' | 'accounts'

interface Business {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  industry: string | null
  country: string | null
  created_at: string
  lifecycle: string | null
  linked_clients: number | null
  reviews: { total: number; needs_review: number } | null
}

interface Account {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  country: string | null
  industry: string | null
  status: string | null
  email_verified: boolean | null
  created_at: string
  /** false = no portal account for this login; null = could not be determined; object = exists. */
  portal_account: { id: string } | false | null
  merchant_id: string | null
}

const day = (value: string | null | undefined) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const matches = (q: string, ...fields: Array<string | null | undefined>) => !q || fields.some((f) => (f || '').toLowerCase().includes(q))

export default function AdminMerchantsPage() {
  const [view, setView] = useState<View>('businesses')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async (which: View) => {
    setLoading(true)
    try {
      // /api/admin/merchants verifies session, user-bound admin 2FA and active admin membership.
      const response = await fetch(`/api/admin/merchants?view=${which}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      const rows = which === 'businesses' ? payload?.businesses : payload?.merchants
      if (!response.ok || !Array.isArray(rows)) {
        // A denied or failed read is an error, never an empty list.
        setLoadError(payload?.error || 'Could not load merchants. Please refresh and try again.')
        return
      }
      setLoadError(null)
      if (which === 'businesses') setBusinesses(rows)
      else setAccounts(rows)
    } catch {
      setLoadError('Could not load merchants. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(view) }, [load, view])

  const q = query.trim().toLowerCase()
  const shownBusinesses = businesses.filter((b) => matches(q, b.business_name, b.contact_name, b.email, b.industry, b.country))
  const shownAccounts = accounts.filter((a) => matches(q, a.business_name, a.contact_name, a.email, a.industry, a.country))
  const isBusinesses = view === 'businesses'
  const total = isBusinesses ? businesses.length : accounts.length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Clients & Delivery"
        title="Merchants"
        description={isBusinesses
          ? 'Businesses that submitted a Growth Review. Open one to see its assessments, reviews, Growth Profiles and portal account.'
          : 'People who signed up for the Client Portal. A sign-up is a login, not a business: it is only tied to a business through its portal account.'}
      />

      <AdminToolbar>
        <AdminFilterGroup<View>
          label="Choose a list"
          options={[{ key: 'businesses', label: 'Businesses' }, { key: 'accounts', label: 'Sign-up accounts' }]}
          value={view}
          onChange={(next) => { setView(next); setQuery('') }}
        />
        <AdminSearchField label="Search merchants" value={query} onChange={setQuery} placeholder="Search business, contact or email" />
      </AdminToolbar>

      {loading ? (
        <AdminLoadingState label="Loading merchants…" />
      ) : loadError ? (
        <AdminErrorState title="Could not load merchants" message={loadError} onRetry={() => load(view)} />
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
          <AdminEmptyState title={isBusinesses ? 'No businesses yet' : 'No sign-up accounts yet'} description={isBusinesses ? 'A business appears here when it submits a Growth Review.' : 'An account appears here when someone confirms their Client Portal sign-up.'} />
        </div>
      ) : (isBusinesses ? shownBusinesses.length : shownAccounts.length) === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
          <AdminEmptyState title="Nothing matches" description="Try a different search." action={<AdminButton variant="secondary" onClick={() => setQuery('')}>Clear search</AdminButton>} />
        </div>
      ) : isBusinesses ? (
        <ul aria-label="Businesses" className="space-y-3">
          {shownBusinesses.map((b) => (
            <li key={b.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/admin/merchants/${b.id}`} className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)]">{b.business_name || 'Unnamed business'}</Link>
                  <p className="mt-0.5 break-words text-sm text-[var(--text-secondary)]">{[b.contact_name, b.email].filter(Boolean).join(' · ') || 'No contact details stored'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{[b.industry, b.country, day(b.created_at) && `First seen ${day(b.created_at)}`].filter(Boolean).join(' · ')}</p>
                </div>
                <Link href={`/admin/merchants/${b.id}`} className={adminBtn('secondary', 'sm')}>Open record</Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {b.lifecycle && <AdminStatusBadge dot>{b.lifecycle.replace(/_/g, ' ')}</AdminStatusBadge>}
                {b.reviews === null ? <AdminStatusBadge>Reviews unknown</AdminStatusBadge>
                  : b.reviews.needs_review > 0 ? <AdminStatusBadge tone="orange" dot>{b.reviews.needs_review} to review</AdminStatusBadge>
                    : b.reviews.total > 0 ? <AdminStatusBadge tone="green" dot>{b.reviews.total} {b.reviews.total === 1 ? 'review' : 'reviews'} done</AdminStatusBadge>
                      : <AdminStatusBadge>No reviews</AdminStatusBadge>}
                {b.linked_clients === null ? <AdminStatusBadge>Portal account unknown</AdminStatusBadge>
                  : b.linked_clients === 0 ? <AdminStatusBadge>No portal account</AdminStatusBadge>
                    : b.linked_clients === 1 ? <AdminStatusBadge tone="blue" dot>Portal account linked</AdminStatusBadge>
                      : <AdminStatusBadge tone="amber" dot>{b.linked_clients} portal accounts linked</AdminStatusBadge>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label="Sign-up accounts" className="space-y-3">
          {shownAccounts.map((a) => (
            <li key={a.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-base font-bold text-[var(--text-primary)]">{a.business_name || '—'}</p>
                  <p className="mt-0.5 break-words text-sm text-[var(--text-secondary)]">{[a.contact_name, a.email].filter(Boolean).join(' · ') || 'No contact details stored'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{[a.industry, a.country, day(a.created_at) && `Signed up ${day(a.created_at)}`].filter(Boolean).join(' · ')}</p>
                </div>
                {a.merchant_id && <Link href={`/admin/merchants/${a.merchant_id}`} className={adminBtn('secondary', 'sm')}>Open business record</Link>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <AdminStatusBadge tone={a.status === 'active' ? 'green' : 'amber'} dot>Sign-up {a.status || 'unknown'}</AdminStatusBadge>
                <AdminStatusBadge tone={a.email_verified ? 'green' : 'neutral'}>{a.email_verified ? 'Email verified' : 'Email not verified'}</AdminStatusBadge>
                {a.portal_account === null ? <AdminStatusBadge>Portal account unknown</AdminStatusBadge>
                  : a.portal_account === false ? <AdminStatusBadge>No portal account</AdminStatusBadge>
                    : <AdminStatusBadge tone="blue">Has a portal account</AdminStatusBadge>}
                {a.portal_account !== null && (a.merchant_id ? <AdminStatusBadge tone="blue" dot>Linked to a business</AdminStatusBadge> : <AdminStatusBadge>Not linked to a business</AdminStatusBadge>)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !loadError && total > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {isBusinesses
            ? 'A business is tied to a portal account only through clients.merchant_id, set by an accepted invitation or an audited admin link. Nothing is matched by name or email.'
            : 'Sign-up status is the login’s own lifecycle field. It is not a programme approval.'}
        </p>
      )}
    </div>
  )
}
