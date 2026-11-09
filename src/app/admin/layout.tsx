// src/app/admin/layout.tsx
//
// Admin layout (Phase A1). Declares the Admin's own scoped surface ([data-surface="admin"], the Hbee
// palette, light by default with a remembered dark option) and renders the authorised admin inside
// AdminShell (sidebar, topbar, mobile drawer).
//
// AUTHENTICATION IS UNCHANGED. The session check, the admin_users lookup, the redirect rules and the logout
// sequence below are the previous implementation, moved as-is. Server-side protection is still
// middleware.ts (session, active admin_users row, signed user-bound 2FA cookie); this browser-side check
// stays defence in depth. There is no admin sign-up anywhere: access is provisioned.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import '@/styles/site-tokens.css'
import '@/styles/admin-tokens.css'
import { manrope } from '@/components/site/fonts'
import { supabase } from '@/lib/supabase'
import { fetchSiteSettings } from '@/lib/site-settings'
import { ADMIN_THEME_TOGGLE_ENABLED, AdminGateLoading, AdminShell } from '@/components/admin/shell/AdminShell'

const THEME_KEY = 'hbee-admin-theme'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [adminAvatar, setAdminAvatar] = useState('')
  const [adminName, setAdminName] = useState('')
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Theme preference is per browser. The auth check below shows a loading screen first, so a saved
  // dark preference is applied before the shell is first painted.
  useEffect(() => {
    // A saved preference is honoured only while the toggle is offered; otherwise Admin is always Light.
    if (!ADMIN_THEME_TOGGLE_ENABLED) return
    try { if (localStorage.getItem(THEME_KEY) === 'dark') setTheme('dark') } catch { /* storage unavailable: stay light */ }
  }, [])
  const toggleTheme = useCallback(() => {
    if (!ADMIN_THEME_TOGGLE_ENABLED) return
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  // Load site settings once. This must stay out of the effect below: that
  // effect depends on `siteSettings`, so setting it from there would re-run the
  // effect (and this fetch) forever once the canonical row exists.
  useEffect(() => {
    async function fetchData() {
      const { data: site } = await fetchSiteSettings()
      if (site) setSiteSettings(site)
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()

      // If on login page, don't check admin
      if (pathname === '/admin/login' || pathname === '/admin/reset-password') {
        setLoading(false)
        return
      }

      // If not logged in → redirect to login
      if (!data.user) {
        router.push('/admin/login')
        setLoading(false)
        return
      }

      // Check the user is an admin (database check, matching middleware.ts)
      if (data.user) {
        const isAdmin = await checkIsAdmin(data.user)

        if (!isAdmin) {
          router.push('/client-portal')
          setLoading(false)
          return
        }

        setIsAuthorized(true)
        setUser(data.user)
        const avatar = data.user?.user_metadata?.avatar_url || siteSettings?.logo_url || ''
        const name = data.user?.user_metadata?.full_name || siteSettings?.site_name || 'Admin'
        setAdminAvatar(avatar)
        setAdminName(name)

        if (avatar) localStorage.setItem('admin_avatar', avatar)
        if (name) localStorage.setItem('admin_name', name)
      }

      setLoading(false)
    }
    checkAuth()

    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      setUnreadInquiries(count || 0)
    }
    fetchUnread()

    const handleProfileUpdate = () => {
      const avatar = localStorage.getItem('admin_avatar') || siteSettings?.logo_url || ''
      const name = localStorage.getItem('admin_name') || siteSettings?.site_name || 'Admin'
      setAdminAvatar(avatar)
      setAdminName(name)
    }
    window.addEventListener('adminProfileUpdate', handleProfileUpdate)
    return () => window.removeEventListener('adminProfileUpdate', handleProfileUpdate)
  }, [pathname, router, siteSettings])

  async function checkIsAdmin(user: any): Promise<boolean> {
    // Database check only — the hardcoded-email fallback has been removed.
    // Admin status is resolved exclusively through admin_users, matching
    // middleware.ts (the authoritative access boundary).
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('⚠️ Admin check error:', error)
        return false
      }

      if (data) {
        return true
      }
    } catch (err) {
      console.error('⚠️ Admin check exception:', err)
    }

    return false
  }

  async function handleLogout() {
    // Clear the httpOnly 2FA-verified cookie server-side first — client JS
    // cannot delete an httpOnly cookie itself — then end the Supabase session.
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // Non-fatal: proceed with sign-out regardless, so a network blip never
      // traps the admin in a logged-in-but-can't-log-out state.
    }
    await supabase.auth.signOut()
    localStorage.removeItem('admin_avatar')
    localStorage.removeItem('admin_name')
    router.push('/admin/login')
  }

  const surface = (content: React.ReactNode) => (
    <div data-surface="admin" data-admin-theme={theme} className={manrope.variable}>
      {content}
    </div>
  )

  // The login screen renders without the shell.
  if (pathname === '/admin/login' || pathname === '/admin/reset-password') return surface(children)

  if (loading) return surface(<AdminGateLoading />)
  if (!user || !isAuthorized) return null

  return surface(
    <AdminShell
      user={{ name: adminName || 'Admin', email: user?.email || '', avatarUrl: adminAvatar || undefined }}
      unreadInquiries={unreadInquiries}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>,
  )
}
