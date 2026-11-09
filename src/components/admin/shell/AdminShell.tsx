'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, FileText, Gauge, Inbox, LayoutGrid, LogOut, Mail, Menu, Moon, Settings, Sun, Users, X, type LucideIcon } from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { ADMIN_HOME, ADMIN_NAV, activeAdminNav, adminSectionTitle, isAdminNavActive, type AdminNavGroup, type AdminNavIcon } from './admin-nav'
import styles from './admin-shell.module.css'

/**
 * The Admin shell (Phase A1): sidebar, topbar and mobile drawer. Presentation only. Authentication, the
 * admin_users check, 2FA and logout stay in app/admin/layout.tsx exactly as before; this component
 * receives the already-authorised admin and the logout handler, and renders the page inside <main>.
 *
 * ONE navigation definition (admin-nav.ts) feeds both the desktop sidebar and the drawer.
 */

const GROUP_ICONS: Record<AdminNavIcon, LucideIcon> = {
  overview: LayoutGrid,
  growth: Gauge,
  clients: Users,
  content: FileText,
  inbox: Inbox,
  account: Settings,
}

export interface AdminShellUser {
  name: string
  email: string
  avatarUrl?: string
}

interface AdminShellProps {
  user: AdminShellUser
  unreadInquiries: number
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onLogout: () => void | Promise<void>
  /** Preview/test only: treat this as the current path instead of the browser's. */
  pathOverride?: string
  children: ReactNode
}

function Avatar({ user }: { user: AdminShellUser }) {
  return (
    <span className={styles.avatar} aria-hidden="true">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : (user.name.trim().charAt(0) || 'A').toUpperCase()}
    </span>
  )
}

function SidebarBody({ user, path, unreadInquiries, onLogout, onNavigate, closeButton }: {
  user: AdminShellUser
  path: string
  unreadInquiries: number
  onLogout: () => void | Promise<void>
  onNavigate?: () => void
  closeButton?: ReactNode
}) {
  const activeGroupId = activeAdminNav(path)?.group.id
  // The group that owns the current page (and Overview) start open; the rest stay folded so ~35 routes
  // read as six sections instead of one long list. The visitor can fold and unfold any of them.
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ overview: true, ...(activeGroupId ? { [activeGroupId]: true } : {}) }))
  useEffect(() => { if (activeGroupId) setOpen((o) => (o[activeGroupId] ? o : { ...o, [activeGroupId]: true })) }, [activeGroupId])

  return (
    <div className={styles.sidebarBody}>
      <div className={styles.drawerHead}>
        <div className={styles.brand}>
          <HbeeLogo href={ADMIN_HOME} />
          <p className={styles.context}><span aria-hidden="true" className={styles.node} />Hbee Administration</p>
        </div>
        {closeButton}
      </div>

      <div className={styles.identity}>
        <Avatar user={user} />
        <div className={styles.who}>
          <p className={styles.name}>{user.name}</p>
          <p className={styles.email}>{user.email}</p>
        </div>
      </div>

      <nav aria-label="Admin" className={styles.navScroll}>
        <ul className={styles.groups}>
          {ADMIN_NAV.map((group: AdminNavGroup) => {
            const Icon = GROUP_ICONS[group.icon]
            const expanded = Boolean(open[group.id])
            const listId = `admin-nav-${group.id}`
            return (
              <li key={group.id} className={group.id === activeGroupId ? styles.groupHasActive : undefined}>
                <button type="button" className={styles.groupBtn} aria-expanded={expanded} aria-controls={listId} onClick={() => setOpen((o) => ({ ...o, [group.id]: !o[group.id] }))}>
                  <Icon aria-hidden="true" className={styles.groupIcon} />
                  <span className={styles.groupLabel}>{group.label}</span>
                  <ChevronDown aria-hidden="true" className={styles.chev} />
                </button>
                {expanded && (
                  <ul id={listId} className={styles.items}>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} aria-current={isAdminNavActive(path, item) ? 'page' : undefined} onClick={onNavigate} className={styles.item}>
                          {item.label}
                          {item.badge === 'inquiries' && unreadInquiries > 0 && <span className={styles.count} aria-label={`${unreadInquiries} unread`}>{unreadInquiries > 99 ? '99+' : unreadInquiries}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
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

/**
 * The dark theme is implemented (admin-tokens.css) but has not been visually verified, so it is NOT offered to
 * users yet: Light is the only accessible Admin theme. Set to true once dark-mode QA is complete.
 */
export const ADMIN_THEME_TOGGLE_ENABLED = false

export function AdminShell({ user, unreadInquiries, theme, onToggleTheme, onLogout, pathOverride, children }: AdminShellProps) {
  const browserPath = usePathname()
  const path = pathOverride ?? browserPath ?? ADMIN_HOME

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const profileBtnRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => { setDrawerOpen(false); hamburgerRef.current?.focus() }, [])
  const closeProfile = useCallback((restoreFocus = true) => { setProfileOpen(false); if (restoreFocus) profileBtnRef.current?.focus() }, [])

  // Navigating anywhere closes both overlays.
  useEffect(() => { setDrawerOpen(false); setProfileOpen(false) }, [path])
  useEffect(() => { if (drawerOpen) closeRef.current?.focus() }, [drawerOpen])
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

  const firstName = user.name.trim().split(/\s+/)[0] || 'Account'

  return (
    <div className={styles.shell} data-admin-shell="">
      <aside className={styles.sidebar}>
        <SidebarBody user={user} path={path} unreadInquiries={unreadInquiries} onLogout={onLogout} />
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topLeft}>
            <button ref={hamburgerRef} type="button" className={`${styles.iconBtn} ${styles.hamburger}`} aria-label="Open navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
              <Menu aria-hidden="true" />
            </button>
            <p className={styles.section}>{adminSectionTitle(path)}</p>
          </div>

          <div className={styles.topRight}>
            {ADMIN_THEME_TOGGLE_ENABLED && (
              <button type="button" className={styles.iconBtn} onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </button>
            )}

            {/* Unread contact_submissions: its own indicator, separate from notifications. */}
            <Link href="/admin/inquiries" className={styles.iconBtn} aria-label={unreadInquiries > 0 ? `Inquiries, ${unreadInquiries} unread` : 'Inquiries'}>
              <Mail aria-hidden="true" />
              {unreadInquiries > 0 && <span aria-hidden="true" className={styles.badge}>{unreadInquiries > 99 ? '99+' : unreadInquiries}</span>}
            </Link>

            {/* The real notification control: unchanged behaviour (API-backed unread count and list). */}
            <NotificationBell />

            <div className={styles.profileWrap}>
              <button ref={profileBtnRef} type="button" className={styles.profileBtn} aria-expanded={profileOpen} aria-controls="admin-profile-panel" aria-label={`Account menu for ${user.name}`} onClick={() => setProfileOpen((v) => !v)}>
                <Avatar user={user} />
                <span className={styles.profileName}>{firstName}</span>
                <ChevronDown aria-hidden="true" className={styles.chevron} />
              </button>
              {profileOpen && (
                <>
                  <div className={styles.scrim} onClick={() => closeProfile(false)} />
                  <div id="admin-profile-panel" className={styles.panel}>
                    <p className={styles.panelLabel}>Signed in as</p>
                    <p className={styles.panelEmail}>{user.email || '—'}</p>
                    <Link href="/admin/profile" className={styles.panelLink} onClick={() => closeProfile(false)}>Profile Settings</Link>
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
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>

      {drawerOpen && (
        <>
          <div className={styles.backdrop} onClick={closeDrawer} />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Admin navigation">
            <SidebarBody
              user={user}
              path={path}
              unreadInquiries={unreadInquiries}
              onLogout={onLogout}
              onNavigate={() => setDrawerOpen(false)}
              closeButton={<button ref={closeRef} type="button" className={styles.drawerClose} aria-label="Close navigation" onClick={closeDrawer}><X aria-hidden="true" /></button>}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** The signed-in gate's own loading screen (used by the layout while it checks the session). */
export function AdminGateLoading() {
  return (
    <div className={styles.centered} role="status">
      <div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.centeredText}>Checking your session…</p>
      </div>
    </div>
  )
}
