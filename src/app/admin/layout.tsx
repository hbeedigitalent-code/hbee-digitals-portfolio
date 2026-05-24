'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  name: string
  href: string
  icon: string
  badge?: number
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()

      if (!data.user && pathname !== '/admin/login') {
        router.push('/admin/login')
      } else {
        setUser(data.user)
      }

      setLoading(false)
    }

    checkAuth()
  }, [pathname, router])

  useEffect(() => {
    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('is_read', false)

      setUnreadInquiries(count || 0)
    }

    if (user) fetchUnread()
  }, [user, pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: '/svgs/analytics.svg',
    },
    {
      name: 'Inquiries',
      href: '/admin/inquiries',
      icon: '/svgs/inquiries.svg',
      badge: unreadInquiries,
    },
    {
      name: 'Hero Section',
      href: '/admin/hero',
      icon: '/svgs/hero.svg',
    },
    {
      name: 'About Page',
      href: '/admin/about',
      icon: '/svgs/about.svg',
    },
    {
      name: 'Email Templates',
      href: '/admin/email-templates',
      icon: '/svgs/email.svg',
    },
    {
      name: 'Email Logs',
      href: '/admin/email-logs',
      icon: '/svgs/messages.svg',
},
    {
      name: 'Services',
      href: '/admin/services',
      icon: '/svgs/services.svg',
    },
    {
      name: 'Pricing',
      href: '/admin/pricing',
      icon: '/svgs/pricing.svg',
    },
    {
      name: 'Portfolio',
      href: '/admin/portfolio',
      icon: '/svgs/portfolio-icon.svg',
    },
    {
      name: 'Blog Posts',
      href: '/admin/blog',
      icon: '/svgs/blog.svg',
    },
    {
      name: 'Testimonials',
      href: '/admin/testimonials',
      icon: '/svgs/testimonials.svg',
    },
    {
      name: 'Team Members',
      href: '/admin/team',
      icon: '/svgs/team.svg',
    },
    {
      name: 'FAQs',
      href: '/admin/faqs',
      icon: '/svgs/faq.svg',
    },
    {
      name: 'Navigation Menu',
      href: '/admin/menu',
      icon: '/svgs/menu.svg',
    },
    {
      name: 'Footer',
      href: '/admin/footer',
      icon: '/svgs/footer.svg',
    },
    {
      name: 'Site Settings',
      href: '/admin/settings',
      icon: '/svgs/settings.svg',
    },
  ]

  const currentPage =
    navItems.find((item) => item.href === pathname)?.name || 'Admin Dashboard'

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
        <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#39D97A] border-t-transparent" />
          <p className="text-sm font-bold text-white/60">Loading Hbee Admin...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-[#39D97A]/8 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:86px_86px] opacity-25" />
      </div>

      {mobileMenuOpen && (
        <button
          aria-label="Close admin menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-[#1E314A] bg-[#081321]/96 shadow-[24px_0_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-300 ${
          sidebarOpen ? 'w-76 lg:w-72' : 'w-20'
        } ${
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[#1E314A] p-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-w-0 items-center gap-3 overflow-hidden"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/25 bg-[#39D97A]/10 shadow-[0_0_30px_rgba(57,217,122,0.14)]">
                <img
                  src="/svgs/logo.svg"
                  alt="Hbee Digitals"
                  className="h-8 w-8 object-contain"
                />
              </span>

              {sidebarOpen && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black tracking-[-0.02em]">
                    Hbee Digitals
                  </span>

                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                    Admin Studio
                  </span>
                </span>
              )}
            </Link>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#1E314A] bg-[#0E1B2D] text-sm font-black text-white/60 transition hover:border-[#39D97A]/25 hover:text-white lg:flex"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? '‹' : '›'}
            </button>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#1E314A] bg-[#0E1B2D] text-white/70 lg:hidden"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          {sidebarOpen && (
            <div className="mt-5 rounded-[1.4rem] border border-[#39D97A]/18 bg-[#39D97A]/8 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Lead Status
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white/70">
                  New inquiries
                </span>
                <span className="rounded-full bg-[#39D97A] px-3 py-1 text-xs font-black text-[#06101F]">
                  {unreadInquiries}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

            const badgeCount = Number(item.badge || 0)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                  active
                    ? 'border border-[#39D97A]/25 bg-[#39D97A]/10 text-white shadow-[0_0_30px_rgba(57,217,122,0.08)]'
                    : 'border border-transparent text-white/58 hover:border-[#1E314A] hover:bg-[#0E1B2D] hover:text-white'
                } ${sidebarOpen ? '' : 'justify-center'}`}
              >
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition ${
                    active
                      ? 'border-[#39D97A]/22 bg-[#39D97A]/10'
                      : 'border-[#1E314A] bg-[#07111F]'
                  }`}
                >
                  <img
                    src={item.icon}
                    alt=""
                    className="h-5 w-5 object-contain"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(626%) hue-rotate(73deg) brightness(94%) contrast(89%)',
                    }}
                  />
                </span>

                {sidebarOpen && (
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {item.name}
                  </span>
                )}

                {badgeCount > 0 && (
                  <span
                    className={`rounded-full bg-[#39D97A] px-2 py-0.5 text-[10px] font-black text-[#06101F] ${
                      sidebarOpen ? 'ml-auto' : 'absolute right-1 top-1'
                    }`}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#1E314A] p-4">
          {sidebarOpen && (
            <div className="mb-4 flex items-center gap-3 rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <img
                  src="/svgs/profile.svg"
                  alt=""
                  className="h-5 w-5 object-contain"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(626%) hue-rotate(73deg) brightness(94%) contrast(89%)',
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">
                  Admin User
                </p>
                <p className="truncate text-[11px] text-white/42">
                  {user?.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15 ${
              sidebarOpen ? '' : 'px-2'
            }`}
          >
            {sidebarOpen ? 'Logout' : '↩'}
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-[#1E314A] bg-[#07111F]/88 px-5 py-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1E314A] bg-[#0E1B2D] text-white/70 lg:hidden"
                aria-label="Open admin menu"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Hbee Digitals CMS
                </p>

                <h1 className="truncate text-lg font-black tracking-[-0.03em] sm:text-xl">
                  {currentPage}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/inquiries"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/25"
                aria-label="Notifications"
              >
                <img
                  src="/svgs/notification.svg"
                  alt=""
                  className="h-5 w-5 object-contain"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(626%) hue-rotate(73deg) brightness(94%) contrast(89%)',
                  }}
                />

                {unreadInquiries > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#39D97A] px-1 text-[10px] font-black text-[#06101F]">
                    {unreadInquiries > 9 ? '9+' : unreadInquiries}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/inquiries"
                className="hidden rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-xs font-black text-[#39D97A] transition hover:bg-[#39D97A]/15 sm:inline-flex"
              >
                New Inquiries
                {unreadInquiries > 0 && (
                  <span className="ml-2 rounded-full bg-[#39D97A] px-2 py-0.5 text-[#06101F]">
                    {unreadInquiries}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex h-11 items-center gap-2 rounded-2xl border border-[#1E314A] bg-[#0E1B2D] px-3 transition hover:border-[#39D97A]/25"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#39D97A] text-xs font-black text-[#06101F]">
                    {user?.email?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                  <span className="hidden text-xs font-bold text-white/60 md:block">
                    Admin
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                      Signed in as
                    </p>
                    <p className="mt-2 break-words text-sm font-bold text-white/70">
                      {user?.email}
                    </p>

                    <button
                      onClick={handleLogout}
                      className="mt-4 w-full rounded-full border border-red-400/25 bg-red-400/10 px-4 py-2.5 text-sm font-black text-red-300"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-5 lg:p-7">{children}</div>
      </main>
    </div>
  )
}