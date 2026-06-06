'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItemsBase = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
  { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', hasBadge: true },
  { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter' },
  { name: 'Campaign Templates', href: '/admin/newsletter/templates', icon: 'newsletter' },
  { name: 'Subscribers', href: '/admin/subscribers', icon: 'user' },
  { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
  { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category' },
  { name: 'Blog Comments', href: '/admin/comments', icon: 'comment' },
  { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
  { name: 'About Page', href: '/admin/about', icon: 'about' },
  { name: 'Services', href: '/admin/services', icon: 'digital-services' },
  { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
  { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
  { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
  { name: 'Team Members', href: '/admin/team', icon: 'team' },
  { name: 'FAQs', href: '/admin/faqs', icon: 'faq' },
  { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
  { name: 'Profile', href: '/admin/profile', icon: 'user' },
  { name: 'Settings', href: '/admin/settings', icon: 'settings' },
]

function PublicSvgIcon({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center ${
        active ? 'brightness-0' : ''
      }`}
    >
      <img
        src={`/svgs/${name}.svg`}
        alt=""
        className="h-4 w-4 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </span>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)

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
      setLoading(false)
    }

    init()
  }, [pathname, router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
        Loading admin...
      </div>
    )
  }

  if (!user) return null

  const currentPage =
    navItemsBase.find((item) => pathname === item.href)?.name ||
    navItemsBase.find((item) => item.href !== '/admin/dashboard' && pathname.startsWith(item.href))?.name ||
    'Dashboard'

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-[#07111F] text-white ${
        mobile ? '' : 'hidden lg:flex'
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#39D97A]">
            <img src="/svgs/admin-logo.svg" alt="" className="h-7 w-7 object-contain" />
          </div>

          <div>
            <p className="text-sm font-black">Hbee Digitals</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              Admin Studio
            </p>
          </div>
        </Link>

        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold"
          >
            Close
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navItemsBase.map((item) => {
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
                  ? 'bg-[#39D97A] text-[#07111F]'
                  : 'text-[#B8C7DE] hover:bg-white/8 hover:text-white'
              }`}
            >
              <PublicSvgIcon name={item.icon} active={active} />

              <span className="min-w-0 flex-1 truncate">{item.name}</span>

              {item.hasBadge && unreadInquiries > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                  {unreadInquiries > 99 ? '99+' : unreadInquiries}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={logout}
          className="w-full rounded-xl border border-red-400/30 bg-red-400/10 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/20"
        >
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#DDE3EE] bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-[#DDE3EE] p-2 lg:hidden"
            >
              <img src="/svgs/menu.svg" alt="" className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-[#07111F]">{currentPage}</h1>
              <p className="hidden text-xs text-[#70809A] sm:block">
                Manage content, campaigns, leads, and website systems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden rounded-full border border-[#DDE3EE] px-4 py-2 text-xs font-black text-[#07111F] sm:inline-flex"
            >
              View Site
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#07111F] text-sm font-black text-white">
              H
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