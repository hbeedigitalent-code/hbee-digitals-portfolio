// src/app/admin/dashboard/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Mail, RefreshCw, Sparkles, UserPlus } from 'lucide-react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { describeMoney, summariseMoney } from '@/lib/admin/money'
import { businessName, needsReview, reviewStatusLabel, type QueueReview } from '@/lib/admin/growth-review-queue'
import { ADMIN_NAV } from '@/components/admin/shell/admin-nav'
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminLoadingState, AdminMetric, AdminPageHeader, AdminSection, AdminStatusBadge } from '@/components/admin/ui/AdminUi'

/**
 * Admin dashboard (Phase A1): an operational home, not a wall of numbers. It answers four questions in order:
 *   1. What needs my attention?   2. What changed recently?   3. What can I do next?   4. Where do I manage each part?
 *
 * Only real data. Every figure comes from a source the previous dashboard already used (the protected
 * /api/admin/dashboard-stats route for clients / growth_assessments / growth_scores, and the same direct
 * queries for the rest) plus read-only counts of portfolio_items and blog_posts. A figure that cannot be read
 * shows as "—", never as zero. The old "Revenue Pipeline" tile was the sum of OVERDUE invoices; it is now
 * labelled for what it is.
 */

type Count = number | null

interface Snapshot {
  unreadInquiries: Count
  newLeads: Count
  /** growth_reviews still pending / in progress: submitted assessments no human has finished reviewing. */
  reviewsAwaiting: Count
  pendingOnboarding: Count
  overdueTasks: Count
  overdueInvoices: Count
  /** Per-currency overdue total (never mixed, never an assumed currency), or null when none can be stated. */
  overdueInvoiceMoney: string | null
  activeProjects: Count
  totalClients: Count
  tasksDueThisWeek: Count
  growthReady: Count
  portfolio: { visible: Count; hidden: Count; featured: Count }
  insights: { published: Count; drafts: Count }
}

interface Activity { type: 'assessment' | 'lead' | 'inquiry'; title: string; status?: string; at: string; href: string }

const QUICK_ACTIONS = [
  { name: 'New lead', href: '/admin/crm/new' },
  { name: 'New project', href: '/admin/projects/new' },
  { name: 'New task', href: '/admin/tasks/new' },
  { name: 'New insight', href: '/admin/blog/new' },
  { name: 'Growth reviews', href: '/admin/growth-reviews' },
]

const show = (n: Count) => (n === null ? '—' : n.toLocaleString())
const attention = (n: Count) => (n !== null && n > 0 ? 'attention' : 'default') as 'attention' | 'default'

function when(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminDashboardPage() {
  const supabase = createClientComponentClient()
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    // Tables behind server-side authorization (clients, growth_assessments, growth_scores) are read through
    // /api/admin/dashboard-stats, which verifies session, user-bound admin 2FA and active admin membership.
    let adminStats: any = null
    try {
      const statsResponse = await fetch('/api/admin/dashboard-stats', { credentials: 'same-origin' })
      adminStats = await statsResponse.json().catch(() => null)
      if (!statsResponse.ok || !adminStats) {
        setLoadError(adminStats?.error || 'Could not load dashboard statistics. Please refresh and try again.')
        setLoading(false)
        return
      }
    } catch {
      setLoadError('Could not reach the server. Check your connection and try again.')
      setLoading(false)
      return
    }

    const count = <T extends { error: unknown; count?: number | null }>(r: T): Count => (r.error ? null : r.count ?? 0)
    const [projectsRes, leadsRes, onboardingRes, tasksRes, inquiriesRes, invoicesRes, portfolioRes, postsRes, recentLeadsRes, recentInquiriesRes] = await Promise.all([
      supabase.from('projects').select('status, progress', { count: 'exact' }),
      supabase.from('leads').select('status', { count: 'exact' }).eq('status', 'New Lead'),
      supabase.from('client_onboarding_submissions').select('status', { count: 'exact' }).eq('status', 'New Submission'),
      supabase.from('tasks').select('status, due_date'),
      supabase.from('contact_submissions').select('is_read', { count: 'exact' }).eq('is_read', false),
      supabase.from('project_invoices').select('status, amount, currency').eq('status', 'overdue'),
      supabase.from('portfolio_items').select('id, is_active, featured'),
      supabase.from('blog_posts').select('status'),
      supabase.from('leads').select('id, lead_name, status, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('contact_submissions').select('id, full_name, service, is_read, created_at').order('created_at', { ascending: false }).limit(3),
    ])

    // Growth reviews, through the same admin-gated route the review queue uses. This gives the real work queue
    // (a review's own status) and the business name + review id needed to link straight to a review. A failed
    // read shows "—" for the tile and omits the entries; it never shows zero.
    let reviews: QueueReview[] | null = null
    try {
      const reviewsResponse = await fetch('/api/admin/growth-reviews?status=all', { credentials: 'same-origin' })
      const reviewsPayload = await reviewsResponse.json().catch(() => null)
      if (reviewsResponse.ok && Array.isArray(reviewsPayload?.reviews)) reviews = reviewsPayload.reviews
    } catch { /* leave null */ }

    // If the currency column cannot be read, fall back to the count alone (amounts without a currency are not summed).
    const invoiceRows = invoicesRes.error ? await supabase.from('project_invoices').select('status, amount').eq('status', 'overdue') : invoicesRes
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const tasks: any[] | null = tasksRes.error ? null : tasksRes.data || []
    const projects: any[] | null = projectsRes.error ? null : projectsRes.data || []
    const invoices: any[] | null = invoiceRows.error ? null : invoiceRows.data || []
    const portfolio: any[] | null = portfolioRes.error ? null : portfolioRes.data || []
    const posts: any[] | null = postsRes.error ? null : postsRes.data || []

    setSnap({
      unreadInquiries: count(inquiriesRes as any),
      newLeads: count(leadsRes as any),
      reviewsAwaiting: reviews ? reviews.filter((r) => needsReview(r.status)).length : null,
      pendingOnboarding: count(onboardingRes as any),
      overdueTasks: tasks ? tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== 'Completed' && t.status !== 'Done').length : null,
      overdueInvoices: invoices ? invoices.length : null,
      overdueInvoiceMoney: invoices ? describeMoney(summariseMoney(invoices)) : null,
      activeProjects: projects ? projects.filter((p) => p.status !== 'Completed' && p.status !== 'Archived').length : null,
      totalClients: adminStats.totalClients ?? null,
      tasksDueThisWeek: tasks ? tasks.filter((t) => { if (!t.due_date) return false; const due = new Date(t.due_date); return due >= today && due <= weekEnd }).length : null,
      growthReady: adminStats.growthReady ?? null,
      portfolio: {
        visible: portfolio ? portfolio.filter((p) => p.is_active).length : null,
        hidden: portfolio ? portfolio.filter((p) => !p.is_active).length : null,
        featured: portfolio ? portfolio.filter((p) => p.featured).length : null,
      },
      insights: {
        published: posts ? posts.filter((p) => p.status === 'published').length : null,
        drafts: posts ? posts.filter((p) => p.status !== 'published').length : null,
      },
    })

    const items: Activity[] = []
    // Newest first from the API; each links to its review (the review id, not the assessment id).
    for (const r of (reviews || []).slice(0, 3)) {
      items.push({ type: 'assessment', title: `Growth assessment from ${businessName(r)}`, status: reviewStatusLabel(r.status), at: r.created_at, href: `/admin/growth-reviews/${r.id}` })
    }
    for (const l of recentLeadsRes.data || []) items.push({ type: 'lead', title: `New lead: ${l.lead_name}`, status: l.status, at: l.created_at, href: `/admin/crm/${l.id}` })
    for (const m of recentInquiriesRes.data || []) items.push({ type: 'inquiry', title: `Inquiry from ${m.full_name || 'a visitor'}${m.service ? ` about ${m.service}` : ''}`, status: m.is_read ? 'Read' : 'Unread', at: m.created_at, href: '/admin/inquiries' })
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    setActivity(items.slice(0, 6))

    setUpdatedAt(new Date())
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const header = (
    <AdminPageHeader
      eyebrow="Overview"
      title="Dashboard"
      description="What needs attention, what changed recently, and where to go next."
      actions={
        <>
          {updatedAt && <span className="text-xs text-[var(--text-muted)]">Updated {updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>}
          <AdminButton variant="secondary" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh</AdminButton>
        </>
      }
    />
  )

  if (loading && !snap) return <div className="space-y-6">{header}<AdminCard><AdminLoadingState label="Loading your dashboard…" /></AdminCard></div>
  if (loadError) return <div className="space-y-6">{header}<AdminCard><AdminErrorState title="The dashboard could not load" message={loadError} onRetry={() => void load()} /></AdminCard></div>
  if (!snap) return null

  const waiting = [snap.unreadInquiries, snap.newLeads, snap.reviewsAwaiting, snap.pendingOnboarding, snap.overdueTasks, snap.overdueInvoices].reduce<number>((sum, n) => sum + (n ?? 0), 0)

  return (
    <div className="space-y-6 lg:space-y-8">
      {header}

      {/* 1 — What needs my attention? */}
      <AdminSection
        id="attention"
        title="Needs attention"
        description={waiting > 0 ? `${waiting} item${waiting === 1 ? '' : 's'} waiting across the business.` : 'Nothing is waiting right now.'}
        actions={waiting === 0 ? <AdminStatusBadge tone="green" dot>All clear</AdminStatusBadge> : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminMetric label="Unread inquiries" value={show(snap.unreadInquiries)} tone={attention(snap.unreadInquiries)} href="/admin/inquiries" hint="Not yet marked as read" />
          <AdminMetric label="New leads" value={show(snap.newLeads)} tone={attention(snap.newLeads)} href="/admin/crm" hint="Not yet actioned" />
          <AdminMetric label="Growth reviews to do" value={show(snap.reviewsAwaiting)} tone={attention(snap.reviewsAwaiting)} href="/admin/growth-reviews" hint="Submitted, not yet reviewed" />
          <AdminMetric label="Pending onboarding" value={show(snap.pendingOnboarding)} tone={attention(snap.pendingOnboarding)} href="/admin/client-onboarding" hint="New submissions" />
          <AdminMetric label="Overdue tasks" value={show(snap.overdueTasks)} tone={attention(snap.overdueTasks)} href="/admin/tasks" hint="Past their due date" />
          <AdminMetric label="Overdue invoices" value={show(snap.overdueInvoices)} tone={attention(snap.overdueInvoices)} href="/admin/projects" hint={snap.overdueInvoices ? (snap.overdueInvoiceMoney ? `Outstanding: ${snap.overdueInvoiceMoney}` : 'Past their due date') : 'Nothing overdue'} />
        </div>
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        {/* 2 — What changed recently? */}
        <div className="lg:col-span-3">
          <AdminSection id="recent" title="Recent activity" description="The latest assessments, leads and inquiries.">
            {activity.length === 0 ? (
              <AdminEmptyState title="No recent activity" description="New assessments, leads and inquiries will appear here as they arrive." />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {activity.map((a, i) => (
                  <li key={`${a.href}-${i}`}>
                    <Link href={a.href} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span aria-hidden="true" className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                        {a.type === 'assessment' ? <Sparkles className="h-4 w-4" /> : a.type === 'lead' ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{a.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
                          {a.status && <AdminStatusBadge tone={a.status === 'Unread' ? 'orange' : 'neutral'}>{a.status}</AdminStatusBadge>}
                          <span>{when(a.at)}</span>
                        </span>
                      </span>
                      <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        </div>

        {/* 3 — What can I do next? */}
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <AdminSection id="actions" title="Quick actions">
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <AdminButton key={action.href} href={action.href} variant="secondary" size="sm">{action.name}</AdminButton>
              ))}
            </div>
          </AdminSection>

          <AdminSection id="content" title="Website content" actions={<AdminButton href="/admin/portfolio" variant="ghost" size="sm">Portfolio</AdminButton>}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-[var(--text-muted)]">Portfolio visible</dt><dd className="mt-0.5 text-xl font-extrabold text-[var(--text-primary)]">{show(snap.portfolio.visible)}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Hidden</dt><dd className="mt-0.5 text-xl font-extrabold text-[var(--text-primary)]">{show(snap.portfolio.hidden)}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Insights published</dt><dd className="mt-0.5 text-xl font-extrabold text-[var(--text-primary)]">{show(snap.insights.published)}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Drafts</dt><dd className="mt-0.5 text-xl font-extrabold text-[var(--text-primary)]">{show(snap.insights.drafts)}</dd></div>
            </dl>
          </AdminSection>
        </div>
      </div>

      {/* Delivery snapshot */}
      <AdminSection id="snapshot" title="Delivery snapshot" description="Where the work stands.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminMetric label="Active projects" value={show(snap.activeProjects)} href="/admin/projects" />
          <AdminMetric label="Clients" value={show(snap.totalClients)} href="/admin/client-health" />
          <AdminMetric label="Tasks due this week" value={show(snap.tasksDueThisWeek)} href="/admin/tasks" />
          <AdminMetric label="Growth ready" value={show(snap.growthReady)} tone={snap.growthReady ? 'good' : 'default'} href="/admin/growth-profiles" />
        </div>
      </AdminSection>

      {/* 4 — Where do I manage each part of Hbee? */}
      <AdminSection id="manage" title="Manage Hbee" description="Every area of the Admin, grouped by what you are trying to do.">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_NAV.filter((group) => group.id !== 'overview').map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{group.label}</h3>
              <ul className="mt-2 grid gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex min-h-[2rem] items-center text-sm text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AdminSection>

      {waiting === 0 && (
        <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[var(--success)]" />You are up to date.</p>
      )}
    </div>
  )
}
