'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface NavItem {
  name: string
  href: string
  icon: string
  badge?: number
  group?: string
}

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
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const savedSidebarState = localStorage.getItem('admin_sidebar_collapsed')
    if (savedSidebarState !== null) {
      setSidebarOpen(savedSidebarState === 'false')
    }

    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user && pathname !== '/admin/login') {
        router.push('/admin/login')
      } else {
        setUser(data.user)
        
        const avatar = data.user?.user_metadata?.avatar_url || ''
        const name = data.user?.user_metadata?.full_name || ''
        setAdminAvatar(avatar)
        setAdminName(name)
        
        if (avatar) localStorage.setItem('admin_avatar', avatar)
        if (name) localStorage.setItem('admin_name', name)
      }
      setLoading(false)
    }
    checkAuth()
    
    const handleProfileUpdate = () => {
      const avatar = localStorage.getItem('admin_avatar') || ''
      const name = localStorage.getItem('admin_name') || ''
      setAdminAvatar(avatar)
      setAdminName(name)
    }
    
    window.addEventListener('adminProfileUpdate', handleProfileUpdate)
    return () => window.removeEventListener('adminProfileUpdate', handleProfileUpdate)
  }, [pathname, router])

  useEffect(() => {
    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      setUnreadInquiries(count || 0)
    }
    if (user) fetchUnread()
  }, [user, pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('admin_avatar')
    localStorage.removeItem('admin_name')
    router.push('/admin/login')
  }

  const toggleSidebar = () => {
    const newState = !sidebarOpen
    setSidebarOpen(newState)
    localStorage.setItem('admin_sidebar_collapsed', String(!newState))
  }

  // Close mobile menu when clicking a link
  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'analytics', group: 'Main' },
    { name: 'Analytics', href: '/admin/analytics', icon: 'chart', group: 'Main' },
    
    { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', badge: unreadInquiries, group: 'Communications' },
    { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter', group: 'Communications' },
    { name: 'Subscribers', href: '/admin/subscribers', icon: 'users', group: 'Communications' },
    
    { name: 'Hero Section', href: '/admin/hero', icon: 'hero', group: 'Content' },
    { name: 'About Page', href: '/admin/about', icon: 'about', group: 'Content' },
    { name: 'Services', href: '/admin/services', icon: 'services', group: 'Content' },
    { name: 'Pricing', href: '/admin/pricing', icon: 'pricing', group: 'Content' },
    { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio', group: 'Content' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: 'star', group: 'Content' },
    { name: 'Team Members', href: '/admin/team', icon: 'team', group: 'Content' },
    { name: 'FAQs', href: '/admin/faqs', icon: 'faq', group: 'Content' },
    { name: 'Trust Section', href: '/admin/trust', icon: 'verified', group: 'Content' },
    
    { name: 'Blog Posts', href: '/admin/blog', icon: 'blog', group: 'Blog' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category', group: 'Blog' },
    
    { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu', group: 'Design' },
    { name: 'Footer', href: '/admin/footer', icon: 'footer', group: 'Design' },
    
    { name: 'Email Templates', href: '/admin/email-templates', icon: 'email', group: 'Email' },
    { name: 'Email Settings', href: '/admin/email-settings', icon: 'settings', group: 'Email' },
    { name: 'Email Logs', href: '/admin/email-logs', icon: 'messages', group: 'Email' },
    
    { name: 'Image Gallery', href: '/admin/images', icon: 'image', group: 'Media' },
    { name: 'SEO Tools', href: '/admin/seo', icon: 'search', group: 'Media' },
    
    { name: 'Profile', href: '/admin/profile', icon: 'profile', group: 'System' },
    { name: 'Site Settings', href: '/admin/settings', icon: 'settings', group: 'System' },
  ]

  const groupedNavItems = navItems.reduce((acc, item) => {
    const group = item.group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const currentPage = navItems.find((item) => item.href === pathname)?.name || 'Admin Dashboard'

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">Loading Admin...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const avatarLetter = adminName ? adminName.charAt(0).toUpperCase() : (user?.email?.charAt(0)?.toUpperCase() || 'A')

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page)]">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position, independent scrolling */}
      <aside 
        className={`fixed left-0 top-0 z-50 h-full flex flex-col border-r border-[var(--border)] bg-[var(--bg-card)]/98 backdrop-blur-2xl transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <Link 
              href="/admin/dashboard" 
              onClick={handleNavClick} 
              className="flex min-w-0 items-center gap-3 flex-1"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10">
                <SvgIcon name="logo" size={20} color="var(--accent)" />
              </span>
              {sidebarOpen && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">Hbee Digitals</span>
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Admin Studio</span>
                </span>
              )}
            </Link>
            <button 
              onClick={toggleSidebar} 
              className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25 lg:flex"
            >
              <SvgIcon name="chevron-left" size={14} color="var(--accent)" className={`transition ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] lg:hidden"
            >
              ✕
            </button>
          </div>

          {sidebarOpen && (
            <div className="mt-4 rounded-xl border border-[var(--accent)]/18 bg-[var(--accent)]/8 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Lead Status</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">New inquiries</span>
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-[var(--btn-primary-text)]">{unreadInquiries}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - SCROLLABLE AREA */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 min-h-0">
          {Object.entries(groupedNavItems).map(([group, items]) => (
            <div key={group} className="mb-6">
              {sidebarOpen && (
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {group}
                </p>
              )}
              {items.map((item) => {
                const active = pathname === item.href
                const badgeCount = Number(item.badge || 0)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition mb-1 ${
                      active
                        ? 'border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                        : 'border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
                    } ${sidebarOpen ? '' : 'justify-center'}`}
                  >
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition ${
                      active ? 'border-[var(--accent)]/22 bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--bg-section)]'
                    }`}>
                      <SvgIcon name={item.icon} size={16} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                    </span>
                    {sidebarOpen && <span className="flex-1 truncate text-sm font-bold">{item.name}</span>}
                    {badgeCount > 0 && (
                      <span className={`rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-black text-[var(--btn-primary-text)] ${
                        sidebarOpen ? 'ml-auto' : 'absolute -right-1 -top-1'
                      }`}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-[var(--border)] p-4">
          {sidebarOpen && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                {adminAvatar ? (
                  <img src={adminAvatar} alt="Admin" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-[var(--accent)]">{avatarLetter}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black">{adminName || 'Admin User'}</p>
                <p className="truncate text-[10px] text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 py-2 text-sm font-black text-red-300 transition hover:bg-red-400/15 ${
              sidebarOpen ? '' : 'px-2'
            }`}
          >
            <SvgIcon name="logout" size={14} color="#f87171" />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content Area - Independent scrolling */}
      <main className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}>
        {/* Header - Sticky at top */}
        <header className="flex-shrink-0 sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-page)]/95 px-4 py-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)} 
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] lg:hidden"
              >
                <SvgIcon name="menu" size={18} color="var(--text-primary)" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Hbee Digitals CMS</p>
                <h1 className="truncate text-sm font-black sm:text-base">{currentPage}</h1>
              </div>
            </div>
            
            <div className="flex flex-shrink-0 items-center gap-2">
              <Link 
                href="/admin/inquiries" 
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25"
              >
                <SvgIcon name="email" size={16} color="var(--text-muted)" />
                {unreadInquiries > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-[var(--btn-primary-text)]">
                    {unreadInquiries > 9 ? '9+' : unreadInquiries}
                  </span>
                )}
              </Link>
              
              <div className="relative">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)} 
                  className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-2 transition hover:border-[var(--accent)]/25 sm:px-3"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-orange-green text-[10px] font-black text-white">
                    {adminAvatar ? (
                      <img src={adminAvatar} alt="Admin" className="h-full w-full object-cover" />
                    ) : (
                      avatarLetter
                    )}
                  </span>
                  <span className="hidden text-xs font-bold text-[var(--text-secondary)] sm:block md:block">
                    {adminName || 'Admin'}
                  </span>
                  <SvgIcon name="chevron-down" size={12} color="var(--text-muted)" className="hidden sm:block" />
                </button>
                
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-lg)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Signed in as</p>
                      <p className="mt-1 break-words text-xs font-bold">{user?.email}</p>
                      <Link 
                        href="/admin/profile" 
                        onClick={() => setProfileOpen(false)} 
                        className="mt-2 block rounded-lg border border-[var(--border)] px-3 py-2 text-center text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-section)]"
                      >
                        Profile Settings
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="mt-2 w-full rounded-lg border border-red-400/25 bg-red-400/10 py-2 text-xs font-black text-red-300 hover:bg-red-400/15"
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

        {/* Page Content - SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}