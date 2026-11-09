// src/app/admin/growth-profiles/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { displayGrowthClassification } from '@/lib/growth-classification'
import { ProfileChips, type ProfileStatusData } from '@/components/admin/growth/ProfileStatus'
import {
  AdminButton,
  AdminCallout,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterGroup,
  AdminLoadingState,
  AdminNotice,
  AdminPageHeader,
  AdminSearchField,
  AdminStatusBadge,
  AdminToolbar,
  adminBtn,
} from '@/components/admin/ui/AdminUi'

/**
 * Growth Profiles (Phase 6). Same endpoint and same Archive / Activate action as before; what changed is that each
 * profile now shows FIVE SEPARATE, stored facts — review, programme decision, portal account, invitation and
 * whether the Client Portal would actually show it — instead of one "Active" badge. A profile being prepared,
 * active, approved and visible to the client are four different things.
 */

type Flag = 'all' | 'active' | 'archived'
type Visibility = 'all' | 'visible' | 'withheld' | 'awaiting'

interface ProfileRow {
  id: string
  title: string | null
  hgri_score: number | null
  growth_classification: string | null
  is_active: boolean
  created_at: string
  merchant_id: string | null
  assessment_id: string | null
  merchant?: { id?: string; business_name?: string | null; contact_name?: string | null; email?: string | null } | null
  status?: ProfileStatusData
}

const first = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)
const day = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminGrowthProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [releaseEnabled, setReleaseEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [flag, setFlag] = useState<Flag>('all')
  const [visibility, setVisibility] = useState<Visibility>('all')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // /api/admin/growth-profiles verifies session, user-bound admin 2FA and active admin membership.
      const response = await fetch(`/api/admin/growth-profiles?filter=${encodeURIComponent(flag)}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.profiles)) {
        // A denied or failed read is an error, never an empty list.
        setLoadError(payload?.error || 'Could not load profiles. Please refresh and try again.')
        setProfiles([])
        return
      }
      setLoadError(null)
      setProfiles(payload.profiles)
      setReleaseEnabled(typeof payload.releaseEnabled === 'boolean' ? payload.releaseEnabled : null)
    } catch {
      setLoadError('Could not load profiles. Please refresh and try again.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [flag])

  useEffect(() => { void load() }, [load])

  async function toggleProfileStatus(profile: ProfileRow) {
    const next = !profile.is_active
    const message = next
      ? 'Activate this profile?'
      : 'Archive this profile?\n\nArchiving only changes the admin flag. The Client Portal shows the profile named on the merchant’s programme approval, so archiving does NOT withdraw a release. To withdraw, record a withdrawal on the review.'
    if (!confirm(message)) return

    setBusyId(profile.id)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/growth-profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ is_active: next }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setNotice({ tone: 'error', text: payload?.error || 'Failed to update the profile.' })
        return
      }
      setNotice({ tone: 'success', text: next ? 'Profile activated.' : 'Profile archived.' })
      await load()
    } catch {
      setNotice({ tone: 'error', text: 'An error occurred while updating the profile.' })
    } finally {
      setBusyId(null)
    }
  }

  // A count is shown only when it can be stated truthfully. If any profile's status could not be determined, the
  // visibility counts are left blank rather than shown as a (misleading) zero.
  const visibilityUnknown = profiles.some((p) => !p.status || p.status.release.visible === null)
  const decisionUnknown = profiles.some((p) => !p.status || p.status.release.decisionState === 'unknown')
  const counts = {
    all: profiles.length,
    visible: visibilityUnknown ? undefined : profiles.filter((p) => p.status?.release.visible === true).length,
    awaiting: decisionUnknown ? undefined : profiles.filter((p) => p.status?.release.decisionState === 'none').length,
    withheld: visibilityUnknown ? undefined : profiles.filter((p) => p.status?.release.visible === false).length,
  }
  const q = search.trim().toLowerCase()
  const shown = profiles.filter((p) => {
    if (visibility === 'visible' && p.status?.release.visible !== true) return false
    if (visibility === 'withheld' && p.status?.release.visible !== false) return false
    if (visibility === 'awaiting' && p.status?.release.decisionState !== 'none') return false
    if (!q) return true
    const m = first(p.merchant)
    return [m?.business_name, m?.contact_name, m?.email, p.title].some((f) => (f || '').toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Growth" title="Growth Profiles" description="Each profile is prepared when a review is completed. Whether the merchant can see it depends on a recorded programme decision, a linked portal account and the release gate.">
        <AdminButton variant="secondary" href="/admin/growth-reviews">Growth Reviews</AdminButton>
      </AdminPageHeader>

      {notice && <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>}

      {loading ? (
        <AdminLoadingState label="Loading profiles…" />
      ) : loadError ? (
        <AdminErrorState title="Could not load growth profiles" message={loadError} onRetry={load} />
      ) : (
        <>
          {releaseEnabled === false && (
            <AdminCallout tone="warn" title="The release gate is off">
              No Growth Profile is shown to any merchant yet, whatever has been approved. Approvals are still recorded. Turning the gate on is a deliberate, separate step.
            </AdminCallout>
          )}

          <AdminToolbar>
            <AdminSearchField label="Search profiles" value={search} onChange={setSearch} placeholder="Search business, contact, email or title" />
            <AdminFilterGroup<Visibility>
              label="Filter by client visibility"
              options={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'visible', label: 'Visible to client', count: counts.visible },
                { key: 'awaiting', label: 'Awaiting decision', count: counts.awaiting },
                { key: 'withheld', label: 'Withheld', count: counts.withheld },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
            <AdminFilterGroup<Flag>
              label="Filter by admin flag"
              options={[{ key: 'all', label: 'Any flag' }, { key: 'active', label: 'Active' }, { key: 'archived', label: 'Archived' }]}
              value={flag}
              onChange={setFlag}
            />
          </AdminToolbar>

          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="No growth profiles" description={flag === 'all' ? 'A profile is prepared when a Growth Review is completed.' : `No ${flag} profiles.`} action={<AdminButton variant="secondary" href="/admin/growth-reviews">Open the review queue</AdminButton>} />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="Nothing matches" description="Try a different search or filter." action={<AdminButton variant="secondary" onClick={() => { setSearch(''); setVisibility('all') }}>Clear filters</AdminButton>} />
            </div>
          ) : (
            <ul aria-label="Growth profiles" className="space-y-3">
              {shown.map((p) => {
                const merchant = first(p.merchant)
                const blocker = p.status?.release.visible === false ? p.status.release.blockers[0]?.text : null
                return (
                  <li key={p.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <Link href={`/admin/growth-profiles/${p.id}`} className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)]">{merchant?.business_name || p.title || 'Unnamed business'}</Link>
                        <p className="mt-0.5 break-words text-sm text-[var(--text-secondary)]">{[merchant?.contact_name, merchant?.email].filter(Boolean).join(' · ') || 'No contact details stored'}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {[p.hgri_score ? `HGRI ${p.hgri_score}` : null, p.growth_classification && displayGrowthClassification(p.growth_classification), day(p.created_at) && `Prepared ${day(p.created_at)}`].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/growth-profiles/${p.id}`} className={adminBtn('secondary', 'sm')}>Open</Link>
                        <button type="button" onClick={() => toggleProfileStatus(p)} disabled={busyId === p.id} className={adminBtn('ghost', 'sm')}>
                          {busyId === p.id ? 'Saving…' : p.is_active ? 'Archive' : 'Activate'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <AdminStatusBadge tone={p.is_active ? 'neutral' : 'amber'}>{p.is_active ? 'Active flag' : 'Archived flag'}</AdminStatusBadge>
                      <ProfileChips status={p.status} />
                    </div>
                    {blocker && <p className="mt-2 text-xs text-[var(--text-muted)]">Withheld: {blocker}</p>}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            &ldquo;Visible to client&rdquo; means the Client Portal would serve this profile right now: the merchant&rsquo;s latest decision approves this profile, a portal account is linked, and the release gate is on. Completing a review never makes a profile visible.
          </p>
        </>
      )}
    </div>
  )
}
