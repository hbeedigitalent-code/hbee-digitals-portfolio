'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminAvatar, setAdminAvatar] = useState('')
  const [adminName, setAdminName] = useState('Admin')

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'analytics' },

    {
      name: 'Inquiries',
      href: '/admin/inquiries',
      icon: 'email',
      badge: unreadInquiries,
    },

    { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter' },
    { name: 'Campaign Templates', href: '/admin/newsletter/templates', icon: 'newsletter' },
    { name: 'Subscribers', href: '/admin/subscribers', icon: 'users' },

    { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category' },
    { name: 'Blog Comments', href: '/admin/comments', icon: 'messages' },

    { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
    { name: 'About Page', href: '/admin/about', icon: 'about' },
    { name: 'Services', href: '/admin/services', icon: 'services' },
    { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
    { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
    { name: 'Team Members', href: '/admin/team', icon: 'team' },
    { name: 'FAQs', href: '/admin/faqs', icon: 'faq' },

    { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
    { name: 'Profile', href: '/admin/profile', icon: 'profile' },
    { name: 'Settings', href: '/admin/settings', icon: 'settings' },
  ]

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()

      if (!data.user && pathname !== '/admin/login') {
        router.push('/admin/login')
      } else if (data.user) {
        setUser(data.user)

        const avatar = data.user?.user_metadata?.avatar_url || localStorage.getItem('admin_avatar') || ''
        const name = data.user?.user_metadata?.full_name || localStorage.getItem('admin_name') || 'Admin'

        setAdminAvatar(avatar)
        setAdminName(name)

        if (avatar) localStorage.setItem('admin_avatar', avatar)
        if (name) localStorage.setItem('admin_name', name)
      }

      setLoading(false)
    }

    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      setUnreadInquiries(count || 0)
    }

    checkAuth()
    fetchUnread()

    const handleProfileUpdate = () => {
      setAdminAvatar(localStorage.getItem('admin_avatar') || '')
      setAdminName(localStorage.getItem('admin_name') || 'Admin')
    }

    window.addEventListener('adminProfileUpdate', handleProfileUpdate)

    return () => {
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate)
    }
  }, [pathname, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('admin_avatar')
    localStorage.removeItem('admin_name')
    router.push('/admin/login')
  }

  const currentPage =
    navItems.find((item) => item.href === pathname)?.name ||
    navItems.find((item) => pathname.startsWith(item.href) && item.href !== '/admin/dashboard')?.name ||
    'Dashboard'

  const avatarLetter = adminName ? adminName.charAt(0).toUpperCase() : 'A'

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
        Loading...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 lg:flex ${
          sidebarOpen ? 'w-72' : 'w-20'
        }`}
      >
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-orange-green">
                <span className="font-black text-white">H</span>
              </div>

              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--text-primary)]">
                    Hbee Digitals
                  </p>
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                    Admin Studio
                  </p>
                </div>
              )}
            </Link>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  isActive
                    ? 'bg-[var(--accent)] text-[#07111F]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <SvgIcon
                  name={item.icon}
                  size={18}
                  color={isActive ? '#07111F' : 'var(--text-muted)'}
                />

                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-sm font-bold">{item.name}</span>

                    {'badge' in item && item.badge && item.badge > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-400/20 bg-red-400/10 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-400/20"
          >
            {sidebarOpen ? 'Logout' : '←'}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[82%] max-w-sm flex-col border-r border-[var(--border)] bg-[var(--bg-card)] lg:hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-orange-green">
                  <span className="font-black text-white">H</span>
                </div>

                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">Hbee Digitals</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                    Admin Studio
                  </p>
                </div>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      isActive
                        ? 'bg-[var(--accent)] text-[#07111F]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <SvgIcon
                      name={item.icon}
                      size={18}
                      color={isActive ? '#07111F' : 'var(--text-muted)'}
                    />

                    <span className="flex-1 text-sm font-bold">{item.name}</span>

                    {'badge' in item && item.badge && item.badge > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-[var(--border)] p-4">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-red-400/20 bg-red-400/10 py-2.5 text-sm font-black text-red-400"
              >
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-page)]/95 px-4 py-3 backdrop-blur-2xl lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 lg:hidden"
                aria-label="Open menu"
              >
                <SvgIcon name="menu" size={20} color="var(--text-primary)" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black text-[var(--text-primary)]">
                  {currentPage}
                </h1>
                <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                  Manage Hbee Digitals website content, leads, blog, and campaigns.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/admin/inquiries" className="relative rounded-lg p-2 hover:bg-[var(--bg-section)]">
                <SvgIcon name="notification" size={20} color="var(--text-primary)" />

                {unreadInquiries > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                    {unreadInquiries > 99 ? '99+' : unreadInquiries}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-[var(--bg-section)]"
                >
                  {adminAvatar ? (
                    <img
                      src={adminAvatar}
                      alt="Profile"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-orange-green font-black text-white">
                      {avatarLetter}
                    </div>
                  )}

                  <span className="hidden max-w-[120px] truncate text-sm font-bold text-[var(--text-primary)] sm:block">
                    {adminName}
                  </span>

                  <SvgIcon name="chevron-down" size={14} color="var(--text-muted)" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />

                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                        Signed in as
                      </p>

                      <p className="mt-1 break-words text-xs font-bold text-[var(--text-primary)]">
                        {user?.email}
                      </p>

                      <Link
                        href="/admin/profile"
                        onClick={() => setProfileOpen(false)}
                        className="mt-3 block rounded-xl border border-[var(--border)] py-2 text-center text-xs font-black text-[var(--text-primary)] hover:bg-[var(--bg-section)]"
                      >
                        View Profile
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="mt-2 w-full rounded-xl border border-red-400/20 bg-red-400/10 py-2 text-xs font-black text-red-400 hover:bg-red-400/20"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </section>
      </main>
    </div>
  )
}