'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NavItem = {
  name: string
  href: string
  icon: string
  badge?: number
}

type SiteProfile = {
  logo_url?: string | null
  profile_image?: string | null
  company_name?: string | null
}

function SvgMaskIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: string
  className?: string
}) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: `url(/svgs/${name}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${name}.svg) center / contain no-repeat`,
      }}
    />
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [profile, setProfile] = useState<SiteProfile | null>(null)

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', badge: unreadInquiries },
    { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter' },
    { name: 'Subscribers', href: '/admin/subscribers', icon: 'user' },

    { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
    { name: 'About Page', href: '/admin/about', icon: 'about' },
    { name: 'Services', href: '/admin/services', icon: 'services' },
    { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
    { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
    { name: 'Team Members', href: '/admin/team', icon: 'team' },
    { name: 'FAQs', href: '/admin/faqs', icon: 'faq' },

    { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category' },
    { name: 'Comments', href: '/admin/comments', icon: 'comment' },

    { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
    { name: 'Profile', href: '/admin/profile', icon: 'user' },
    { name: 'Settings', href: '/admin/settings', icon: 'settings' },
  ]

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()

      if (!data.user && pathname !== '/admin/login') {
        router.push('/admin/login')
        return
      }

      setUser(data.user || null)

      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      setUnreadInquiries(count || 0)

      const { data: settings } = await supabase
        .from('site_settings')
        .select('logo_url, profile_image, company_name')
        .maybeSingle()

      setProfile(settings || null)
      setLoading(false)
    }

    init()
  }, [pathname, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
        Loading admin...
      </div>
    )
  }

  const currentPage =
    navItems.find((item) => item.href === pathname)?.name ||
    navItems.find((item) => item.href !== '/admin/dashboard' && pathname.startsWith(item.href))?.name ||
    'Dashboard'

  const logoUrl = profile?.logo_url || profile?.profile_image || '/svgs/admin-logo.svg'
  const companyName = profile?.company_name || 'Hbee Digitals'

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex h-full flex-col border-r border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 ${
        sidebarOpen || mobile ? 'w-72' : 'w-20'
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-[var(--border)] px-4">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
          <img
            src={logoUrl}
            alt={companyName}
            className="h-10 w-10 shrink-0 rounded-xl object-cover"
          />

          {(sidebarOpen || mobile) && (
            <div className="min-w-0">
              <p className="truncate text-base font-black text-[var(--text-primary)]">
                {companyName}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                Admin Studio
              </p>
            </div>
          )}
        </Link>

        {mobile ? (
          <button onClick={() => setMobileOpen(false)} className="text-[var(--text-primary)]">
            <SvgMaskIcon name="close" />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden text-[var(--text-muted)] hover:text-[var(--accent)] lg:block"
          >
            <SvgMaskIcon name="chevron-left" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setMobileOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                active
                  ? 'bg-[var(--accent)] text-[#07111F]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SvgMaskIcon name={item.icon} className="h-5 w-5 shrink-0" />

              {(sidebarOpen || mobile) && (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-500 transition hover:bg-red-500/15"
        >
          <SvgMaskIcon name="logout" className="h-4 w-4" />
          {(sidebarOpen || mobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-primary)] lg:hidden"
            >
              <SvgMaskIcon name="menu" />
            </button>

            <h1 className="truncate text-xl font-black text-[var(--text-primary)]">
              {currentPage}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/inquiries"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              aria-label="Notifications"
            >
              <SvgMaskIcon name="bell" className="h-5 w-5" />

              {unreadInquiries > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                  {unreadInquiries > 99 ? '99+' : unreadInquiries}
                </span>
              )}
            </Link>

            <Link href="/admin/profile" className="flex items-center gap-3">
              <img
                src={profile?.profile_image || logoUrl}
                alt={companyName}
                className="h-10 w-10 rounded-full object-cover"
              />

              <span className="hidden font-bold text-[var(--text-primary)] sm:block">
                {companyName}
              </span>

              <SvgMaskIcon name="chevron-down" className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-7">
          {children}
        </section>
      </main>
    </div>
  )
}