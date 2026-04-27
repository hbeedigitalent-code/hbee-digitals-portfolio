'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import ErrorBoundary from '@/components/ErrorBoundary'

interface NavItem {
  name: string
  href: string
  icon: string
  label: string
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [siteLogo, setSiteLogo] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('Admin Panel')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let isMounted = true

    if (pathname === '/admin/login') {
      setLoading(false)
      return
    }

    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        
        if (error || !authUser) {
          if (isMounted) router.replace('/admin/login')
        } else {
          if (isMounted) {
            const { data: { user: refreshedUser } } = await supabase.auth.getUser()
            setUser(refreshedUser)
            setUserName(refreshedUser?.user_metadata?.full_name || refreshedUser?.email?.split('@')[0] || 'Admin')
            setAvatarUrl(refreshedUser?.user_metadata?.avatar_url || null)
            
            // Fetch site settings for logo
            const { data: settings } = await supabase.from('site_settings').select('*').single()
            if (settings) {
              setSiteLogo(settings.logo_url || null)
              setSiteName(settings.site_name || 'Admin Panel')
            }
            
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (isMounted) router.replace('/admin/login')
      }
    }
    
    getUser()
    
    return () => { isMounted = false }
  }, [router, pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '/svgs/dashboard.svg', label: 'Dashboard' },
    { name: 'Analytics', href: '/admin/analytics', icon: '/svgs/analytics.svg', label: 'Analytics' },
    { name: 'Profile', href: '/admin/profile', icon: '/svgs/profile.svg', label: 'Profile' },
    { name: 'Blog Posts', href: '/admin/blog', icon: '/svgs/blog.svg', label: 'Blog Posts' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: '/svgs/category.svg', label: 'Blog Categories' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: '/svgs/testimonials.svg', label: 'Testimonials' },
    { name: 'Team Members', href: '/admin/team', icon: '/svgs/team.svg', label: 'Team Members' },
    { name: 'Hero Section', href: '/admin/hero', icon: '/svgs/hero.svg', label: 'Hero Section' },
    { name: 'About Section', href: '/admin/about', icon: '/svgs/about.svg', label: 'About Section' },
    { name: 'Services', href: '/admin/services', icon: '/svgs/services.svg', label: 'Services' },
    { name: 'Projects', href: '/admin/projects', icon: '/svgs/projects.svg', label: 'Projects' },
    { name: 'FAQs', href: '/admin/faqs', icon: '/svgs/faq.svg', label: 'FAQs' },
    { name: 'Call to Action', href: '/admin/cta', icon: '/svgs/cta.svg', label: 'Call to Action' },
    { name: 'Navigation Menu', href: '/admin/menu', icon: '/svgs/menu.svg', label: 'Navigation Menu' },
    { name: 'Footer', href: '/admin/footer', icon: '/svgs/footer.svg', label: 'Footer' },
    { name: 'Image Gallery', href: '/admin/images', icon: '/svgs/gallery.svg', label: 'Image Gallery' },
    { name: 'Subscribers', href: '/admin/subscribers', icon: '/svgs/subscribers.svg', label: 'Subscribers' },
    { name: 'Newsletter', href: '/admin/newsletter', icon: '/svgs/newsletter.svg', label: 'Newsletter' },
    { name: 'SEO Tools', href: '/admin/seo', icon: '/svgs/seo.svg', label: 'SEO Tools' },
    { name: 'Export Data', href: '/admin/export', icon: '/svgs/export.svg', label: 'Export Data' },
    { name: 'Backup', href: '/admin/backup', icon: '/svgs/backup.svg', label: 'Backup & Restore' },
    { name: 'Email Settings', href: '/admin/email-settings', icon: '/svgs/email.svg', label: 'Email Settings' },
    { name: 'Site Settings', href: '/admin/settings', icon: '/svgs/settings.svg', label: 'Site Settings' },
    { name: 'Messages', href: '/admin/messages', icon: '/svgs/messages.svg', label: 'Messages' },
  ]

  if (loading && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-[#0A1D37] to-[#1a2a4a] text-white transition-all duration-300 z-30 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'} w-64`}>
          <div className={`p-5 border-b border-white/10 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  {siteLogo ? (
                    <img src={siteLogo} alt={siteName} className="w-8 h-8 object-contain brightness-0 invert" />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{siteName.charAt(0)}</span>
                    </div>
                  )}
                  <span className="font-bold text-lg truncate">{siteName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white transition hidden lg:block">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-white/50 hover:text-white transition lg:hidden">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white transition hidden lg:block">
                {siteLogo ? (
                  <img src={siteLogo} alt={siteName} className="w-6 h-6 object-contain brightness-0 invert" />
                ) : (
                  <span className="text-white font-bold">{siteName.charAt(0)}</span>
                )}
              </button>
            )}
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${isActive ? 'bg-white/10 border-l-4 border-white' : 'hover:bg-white/5'} ${sidebarOpen ? 'lg:justify-start justify-start' : 'lg:justify-center justify-start'}`}
                  style={{ borderLeftColor: isActive ? 'white' : 'transparent' }}>
                  <img src={item.icon} alt={item.name} className="w-5 h-5 brightness-0 invert flex-shrink-0" />
                  <span className={`text-sm truncate ${sidebarOpen ? 'lg:block block' : 'lg:hidden block'}`}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className={`p-4 border-t border-white/10 mt-auto ${sidebarOpen ? 'block' : 'lg:text-center block'}`}>
            <Link href="/admin/profile" className="flex items-center gap-3 hover:bg-white/5 rounded-lg transition p-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={`flex-1 min-w-0 ${sidebarOpen ? 'lg:block block' : 'lg:hidden block'}`}>
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
              </div>
            </Link>
            <button onClick={handleLogout}
              className={`w-full mt-2 text-white/50 hover:text-white transition text-sm ${sidebarOpen ? 'lg:text-left lg:px-2 text-left px-2' : 'lg:text-center text-left px-2'}`}>
              {sidebarOpen ? 'Logout' : (
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        </aside>

        <main className="transition-all duration-300 min-h-screen lg:ml-64 ml-0">
          <div className="sticky top-0 z-10 bg-white shadow-sm px-4 lg:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-lg lg:text-xl font-semibold text-gray-800 truncate">
                  {navItems.find(item => item.href === pathname)?.label || 'Admin Panel'}
                </h1>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                <span className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Link href="/admin/profile" className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                  )}
                </Link>
              </div>
            </div>
          </div>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </ErrorBoundary>
  )
}