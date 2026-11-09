/**
 * The Admin's one authoritative navigation definition (Phase A1).
 *
 * Pure (no React) so the sidebar, the mobile drawer and the tests read the same list and the same
 * active-matching rule.
 *
 * Every entry below is a route that was ALREADY in the previous sidebar; Phase A1 only regroups them
 * by what the Hbee team is trying to do. Nothing was invented, hidden or removed. Routes that exist in
 * src/app/admin but were never in the sidebar are listed in UNLISTED_ROUTES (title only, not linked).
 */

export type AdminNavIcon = 'overview' | 'growth' | 'clients' | 'content' | 'inbox' | 'account'

export interface AdminNavItem {
  label: string
  href: string
  /** Match only this exact path (a prefix match would otherwise swallow siblings). */
  exact?: boolean
  /** Shows the live unread-inquiries count. */
  badge?: 'inquiries'
}

export interface AdminNavGroup {
  id: string
  label: string
  icon: AdminNavIcon
  items: AdminNavItem[]
}

export const ADMIN_ROOT = '/admin'
export const ADMIN_HOME = '/admin/dashboard'

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: 'Workspace', href: '/admin/workspace' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: 'growth',
    items: [
      { label: 'Growth Reviews', href: '/admin/growth-reviews' },
      { label: 'Growth Profiles', href: '/admin/growth-profiles' },
      { label: 'Growth Intelligence', href: '/admin/growth-intelligence', exact: true },
      { label: 'Audits', href: '/admin/growth-intelligence/audits' },
      { label: 'Opportunities', href: '/admin/growth-intelligence/opportunities' },
      { label: 'Client Health', href: '/admin/client-health' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients & delivery',
    icon: 'clients',
    items: [
      { label: 'CRM / Leads', href: '/admin/crm' },
      { label: 'Client Onboarding', href: '/admin/client-onboarding' },
      { label: 'Merchants', href: '/admin/merchants' },
      { label: 'Client Portal', href: '/admin/client-portal' },
      { label: 'Projects', href: '/admin/projects' },
      { label: 'Tasks', href: '/admin/tasks' },
      { label: 'Proposals', href: '/admin/proposals' },
      { label: 'Agreements', href: '/admin/agreements' },
    ],
  },
  {
    id: 'content',
    label: 'Website content',
    icon: 'content',
    items: [
      { label: 'Portfolio', href: '/admin/portfolio' },
      { label: 'Insights', href: '/admin/blog' },
      { label: 'Testimonials', href: '/admin/testimonials' },
      { label: 'Trusted Brands', href: '/admin/trust' },
      { label: 'Before/After', href: '/admin/before-after' },
      { label: 'FAQs', href: '/admin/faqs' },
      { label: 'Services', href: '/admin/services' },
      { label: 'Pricing', href: '/admin/pricing' },
      { label: 'Team Members', href: '/admin/team' },
      { label: 'About Page', href: '/admin/about' },
      { label: 'Hero Section', href: '/admin/hero' },
      { label: 'Navigation Menu', href: '/admin/menu' },
      { label: 'Footer & Newsletter', href: '/admin/footer' },
    ],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: 'inbox',
    items: [
      { label: 'Inquiries', href: '/admin/inquiries', badge: 'inquiries' },
      { label: 'Comments', href: '/admin/comments' },
      { label: 'Newsletter', href: '/admin/newsletter' },
      { label: 'Subscribers', href: '/admin/subscribers' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'account',
    items: [
      { label: 'Profile', href: '/admin/profile' },
      { label: 'Settings', href: '/admin/settings' },
    ],
  },
]

/**
 * Admin routes that exist in src/app/admin but were NEVER in the sidebar. They are not linked here
 * (Phase A1 does not change what is exposed); they only get a sensible page title if reached by URL.
 * Whether each is current, legacy or should be added is an owner decision (see the A1 report).
 */
/**
 * Routes that still work but are not nav entries: they belong to another entry. /admin/growth-assessments is
 * the same record set as Growth Reviews (each assessment has exactly one review), so there is ONE nav entry,
 * "Growth Reviews"; the old URL redirects there (query string kept) and highlights that entry meanwhile.
 */
export const ADMIN_ROUTE_ALIASES: Array<{ from: string; to: string }> = [
  { from: '/admin/growth-assessments', to: '/admin/growth-reviews' },
]

export const UNLISTED_ROUTES: Array<{ prefix: string; title: string }> = [
  { prefix: '/admin/analytics', title: 'Analytics' },
  { prefix: '/admin/backup', title: 'Backup' },
  { prefix: '/admin/bulk-delete', title: 'Bulk delete' },
  { prefix: '/admin/cta', title: 'Call to action' },
  { prefix: '/admin/email-logs', title: 'Email logs' },
  { prefix: '/admin/email-settings', title: 'Email settings' },
  { prefix: '/admin/email-templates', title: 'Email templates' },
  { prefix: '/admin/export', title: 'Export' },
  { prefix: '/admin/images', title: 'Images' },
  { prefix: '/admin/messages', title: 'Messages' },
  { prefix: '/admin/notifications', title: 'Notifications' },
  { prefix: '/admin/seo', title: 'SEO' },
  { prefix: '/admin/video-testimonials', title: 'Video testimonials' },
]

function normalise(pathname: string | null | undefined): string {
  const p = (pathname || '').split(/[?#]/)[0]
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

export interface ActiveAdminNav {
  group: AdminNavGroup
  item: AdminNavItem
}

/**
 * The item that owns this path. When several match (e.g. /admin/growth-intelligence and
 * /admin/growth-intelligence/audits) the LONGEST href wins, so a section's child page highlights the
 * child, and a deeper page (/admin/portfolio/[id]) keeps its parent highlighted.
 */
export function activeAdminNav(pathname: string | null | undefined): ActiveAdminNav | null {
  let path = normalise(pathname)
  const alias = ADMIN_ROUTE_ALIASES.find((a) => under(path, a.from))
  // /admin/growth-assessments/<id> is a resolver for one review, so it also belongs to the target entry.
  if (alias) path = alias.to
  let best: ActiveAdminNav | null = null
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const match = item.exact ? path === item.href : under(path, item.href)
      if (match && (!best || item.href.length > best.item.href.length)) best = { group, item }
    }
  }
  return best
}

export function isAdminNavActive(pathname: string | null | undefined, item: AdminNavItem): boolean {
  const active = activeAdminNav(pathname)
  return Boolean(active && active.item.href === item.href)
}

/** The page's section name for the top bar. */
export function adminSectionTitle(pathname: string | null | undefined): string {
  const active = activeAdminNav(pathname)
  if (active) return active.item.label
  const path = normalise(pathname)
  return UNLISTED_ROUTES.find((r) => under(path, r.prefix))?.title ?? 'Admin'
}

/** Every linked admin href, flat (for tests and the dashboard's "manage" map). */
export const ADMIN_NAV_HREFS: string[] = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href))
