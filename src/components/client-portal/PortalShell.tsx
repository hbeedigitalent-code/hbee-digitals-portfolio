'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  ClipboardList,
  FileSignature,
  FolderOpen,
  Gauge,
  LayoutGrid,
  LogOut,
  Menu,
  MonitorCheck,
  Receipt,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react'
import ClientNotificationBell from '@/components/notifications/ClientNotificationBell'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { PORTAL_NAV, PORTAL_ROOT, isPortalNavActive, portalSectionTitle, type PortalNavIcon } from './portal-nav'
import styles from './portal-shell.module.css'

/**
 * The Client Portal shell (Phase 18.1): left navigation, the top utility area
 * and the mobile drawer. Presentation only — authentication, the client lookup
 * and sign-out stay in PortalAuthGate, and the page content renders unchanged
 * inside <main>.
 *
 * ONE navigation definition (portal-nav.ts) feeds both the desktop sidebar and
 * the drawer, so they cannot drift apart.
 */

const ICONS: Record<PortalNavIcon, LucideIcon> = {
  overview: LayoutGrid,
  'growth-profile': Gauge,
  projects: MonitorCheck,
  proposals: FileSignature,
  files: FolderOpen,
  requests: ClipboardList,
  invoices: Receipt,
  settings: Settings,
}

export interface PortalClient {
  full_name?: string | null
  business_name?: string | null
  email?: string | null
  profile_image?: string | null
}

interface PortalShellProps {
  client: PortalClient
  onLogout: () => void | Promise<void>
  /** Preview/test only: treat this as the current path instead of the browser's. */
  pathOverride?: string
  children: ReactNode
}

function initial(client: PortalClient): string {
  const name = (client.full_name || '').trim()
  return name ? name.charAt(0).toUpperCase() : 'C'
}

function Avatar({ client, small = false }: { client: PortalClient; small?: boolean }) {
  return (
    <span className={`${styles.avatar} ${small ? styles.avatarSm : ''}`} aria-hidden="true">
      {client.profile_image ? <img src={client.profile_image} alt="" /> : initial(client)}
    </span>
  )
}

function SidebarBody({
  client,
  path,
  onLogout,
  onNavigate,
  closeButton,
}: {
  client: PortalClient
  path: string
  onLogout: () => void | Promise<void>
  onNavigate?: () => void
  closeButton?: ReactNode
}) {
  return (
    <div className={styles.sidebarBody}>
      <div className={styles.drawerHead}>
        <div className={styles.brand}>
          <HbeeLogo href={PORTAL_ROOT} />
          <p className={styles.context}>
            <span aria-hidden="true" className={styles.node} />
            Client Portal
          </p>
        </div>
        {closeButton}
      </div>

      <div className={styles.identity}>
        <Avatar client={client} />
        <div className={styles.who}>
          <p className={styles.name}>{client.full_name || 'Your account'}</p>
          {client.business_name && <p className={styles.business}>{client.business_name}</p>}
        </div>
      </div>

      <nav aria-label="Client portal" className={styles.navScroll}>
        <ul className={styles.navList}>
          {PORTAL_NAV.map((item) => {
            const Icon = ICONS[item.icon]
            const active = isPortalNavActive(path, item)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={styles.navItem}
                >
                  <Icon aria-hidden="true" className={styles.navIcon} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFoot}>
        <button type="button" onClick={onLogout} className={styles.logout}>
          <LogOut aria-hidden="true" className={styles.logoutIcon} />
          Logout
        </button>
      </div>
    </div>
  )
}

export function PortalShell({ client, onLogout, pathOverride, children }: PortalShellProps) {
  const browserPath = usePathname()
  const path = pathOverride ?? browserPath ?? PORTAL_ROOT

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const profileBtnRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    hamburgerRef.current?.focus()
  }, [])
  const closeProfile = useCallback((restoreFocus = true) => {
    setProfileOpen(false)
    if (restoreFocus) profileBtnRef.current?.focus()
  }, [])

  // Navigating anywhere closes both overlays.
  useEffect(() => {
    setDrawerOpen(false)
    setProfileOpen(false)
  }, [path])

  // Drawer: focus the close button on open; Escape closes. Profile panel: Escape closes.
  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus()
  }, [drawerOpen])
  useEffect(() => {
    if (!drawerOpen && !profileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (drawerOpen) closeDrawer()
      else closeProfile()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen, profileOpen, closeDrawer, closeProfile])

  const firstName = (client.full_name || '').trim().split(/\s+/)[0] || 'Account'

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <SidebarBody client={client} path={path} onLogout={onLogout} />
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topLeft}>
            <button
              ref={hamburgerRef}
              type="button"
              className={styles.hamburger}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu aria-hidden="true" className={styles.icon20} />
            </button>
            <p className={styles.section}>{portalSectionTitle(path)}</p>
          </div>

          <div className={styles.topRight}>
            {/* The real notification control — unchanged behaviour (API-backed unread count and list). */}
            <ClientNotificationBell />

            <div className={styles.profileWrap}>
              <button
                ref={profileBtnRef}
                type="button"
                className={styles.profileBtn}
                aria-expanded={profileOpen}
                aria-controls="portal-profile-panel"
                aria-label={`Account menu for ${client.full_name || 'your account'}`}
                onClick={() => setProfileOpen((v) => !v)}
              >
                <Avatar client={client} small />
                <span className={styles.profileName}>{firstName}</span>
                <ChevronDown aria-hidden="true" className={styles.chevron} />
              </button>

              {profileOpen && (
                <>
                  <div className={styles.scrim} onClick={() => closeProfile(false)} />
                  <div id="portal-profile-panel" className={styles.panel}>
                    <p className={styles.panelLabel}>Signed in as</p>
                    <p className={styles.panelEmail}>{client.email || '—'}</p>
                    <Link href={`${PORTAL_ROOT}/settings`} className={styles.panelLink} onClick={() => closeProfile(false)}>
                      Profile Settings
                    </Link>
                    <button type="button" onClick={onLogout} className={styles.logout}>
                      <LogOut aria-hidden="true" className={styles.logoutIcon} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
      </div>

      {drawerOpen && (
        <>
          <div className={styles.backdrop} onClick={closeDrawer} />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Portal navigation">
            <SidebarBody
              client={client}
              path={path}
              onLogout={onLogout}
              onNavigate={() => setDrawerOpen(false)}
              closeButton={
                <button ref={closeRef} type="button" className={styles.drawerClose} aria-label="Close navigation" onClick={closeDrawer}>
                  <X aria-hidden="true" className={styles.icon20} />
                </button>
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
