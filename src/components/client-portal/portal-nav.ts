/**
 * The Client Portal's one authoritative navigation definition (Phase 18.1).
 *
 * Pure — no React — so the shell, the mobile drawer and the tests all read the
 * same list and the same active-matching rule.
 *
 * Locked product decisions:
 *   - No Messages: there is no working client messaging backend.
 *   - No Deliverables item: deliverables will live inside Files. The page still
 *     exists and /client-portal/deliverables keeps Files highlighted.
 *   - Notifications are reached from the top-right bell, not the sidebar.
 */

export type PortalNavIcon =
  | 'overview'
  | 'growth-profile'
  | 'projects'
  | 'proposals'
  | 'files'
  | 'requests'
  | 'invoices'
  | 'settings'

export interface PortalNavItem {
  label: string
  href: string
  icon: PortalNavIcon
  /** Exact-only (the Overview root would otherwise match every portal route). */
  exact?: boolean
  /** Other portal paths that belong to this section, so it stays active there. */
  alsoActiveFor?: string[]
}

export const PORTAL_ROOT = '/client-portal'

export const PORTAL_NAV: PortalNavItem[] = [
  { label: 'Overview', href: PORTAL_ROOT, icon: 'overview', exact: true },
  { label: 'Growth Profile', href: `${PORTAL_ROOT}/growth-profile`, icon: 'growth-profile' },
  { label: 'Projects', href: `${PORTAL_ROOT}/projects`, icon: 'projects' },
  { label: 'Proposals', href: `${PORTAL_ROOT}/proposals`, icon: 'proposals' },
  { label: 'Files', href: `${PORTAL_ROOT}/files`, icon: 'files', alsoActiveFor: [`${PORTAL_ROOT}/deliverables`] },
  { label: 'Requests', href: `${PORTAL_ROOT}/requests`, icon: 'requests', alsoActiveFor: [`${PORTAL_ROOT}/project-request`] },
  { label: 'Invoices', href: `${PORTAL_ROOT}/invoices`, icon: 'invoices' },
  { label: 'Settings', href: `${PORTAL_ROOT}/settings`, icon: 'settings' },
]

/** Paths that have a title but no sidebar item (reached from the bell / profile menu). */
const UNLISTED_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: `${PORTAL_ROOT}/notifications`, title: 'Notifications' },
  { prefix: `${PORTAL_ROOT}/messages`, title: 'Messages' },
]

function normalise(pathname: string | null | undefined): string {
  const p = (pathname || '').split(/[?#]/)[0]
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** True when `pathname` is this item's page OR any page beneath it (e.g. /projects/[id]). */
export function isPortalNavActive(pathname: string | null | undefined, item: PortalNavItem): boolean {
  const path = normalise(pathname)
  if (item.exact) return path === item.href
  if (under(path, item.href)) return true
  return (item.alsoActiveFor ?? []).some((base) => under(path, base))
}

/** The sidebar item that owns this path, if any. */
export function activePortalNavItem(pathname: string | null | undefined): PortalNavItem | null {
  return PORTAL_NAV.find((item) => isPortalNavActive(pathname, item)) ?? null
}

/** A short section name for the top bar. */
export function portalSectionTitle(pathname: string | null | undefined): string {
  const item = activePortalNavItem(pathname)
  if (item) return item.label
  const path = normalise(pathname)
  return UNLISTED_TITLES.find((u) => under(path, u.prefix))?.title ?? 'Overview'
}
