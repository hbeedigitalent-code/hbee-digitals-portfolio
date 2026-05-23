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
      name: 'Services',
      href: '/admin/services',
      icon: '/svgs/services.svg',
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

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
        Loading admin...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      {mobileMenuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-[#1E314A] bg-[#081321] transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-20'
        } ${
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#1E314A] p-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 overflow-hidden"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/25 bg-[#39D97A]/10">
              <img
                src="/svgs/logo.svg"
                alt="Hbee Digitals"
                className="h-7 w-7 object-contain"
              />
            </span>

            {sidebarOpen && (
              <span>
                <span className="block text-sm font-black">
                  Hbee Digitals
                </span>

                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                  Admin Studio
                </span>
              </span>
            )}
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden rounded-xl border border-[#1E314A] bg-[#0E1B2D] px-3 py-2 text-xs text-white/60 lg:block"
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = pathname === item.href
            const badgeCount = Number(item.badge || 0)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                  active
                    ? 'border border-[#39D97A]/25 bg-[#39D97A]/10 text-white'
                    : 'text-white/58 hover:bg-[#0E1B2D] hover:text-white'
                } ${
                  sidebarOpen ? '' : 'justify-center'
                }`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#1E314A] bg-[#07111F]">
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
                  <span className="text-sm font-bold">
                    {item.name}
                  </span>
                )}

                {badgeCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#39D97A] px-2 py-0.5 text-[10px] font-black text-[#06101F]">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#1E314A] p-4">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/15 ${
              sidebarOpen ? '' : 'justify-center'
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
        <header className="sticky top-0 z-20 border-b border-[#1E314A] bg-[#07111F]/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl border border-[#1E314A] bg-[#0E1B2D] p-2 lg:hidden"
              >
                ☰
              </button>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Hbee Digitals CMS
                </p>

                <h1 className="text-lg font-black tracking-[-0.03em]">
                  {navItems.find(
                    (item) => item.href === pathname
                  )?.name || 'Admin Dashboard'}
                </h1>
              </div>
            </div>

            <Link
              href="/admin/inquiries"
              className="relative rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-xs font-black text-[#39D97A]"
            >
              New Inquiries

              {unreadInquiries > 0 && (
                <span className="ml-2 rounded-full bg-[#39D97A] px-2 py-0.5 text-[#06101F]">
                  {unreadInquiries}
                </span>
              )}
            </Link>
          </div>
        </header>

        <div className="p-5 lg:p-7">
          {children}
        </div>
      </main>
    </div>
  )
}