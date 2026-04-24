'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let isMounted = true

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          if (isMounted) {
            router.replace('/admin/login')
          }
        } else {
          if (isMounted) {
            setUser(user)
            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin')
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (isMounted) {
          router.replace('/admin/login')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    getUser()
    
    return () => {
      isMounted = false
    }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const navItems: NavItem[] = [
    // Main Section
    { name: 'Dashboard', href: '/admin/dashboard', icon: '/svgs/dashboard.svg', label: 'Dashboard' },
    { name: 'Analytics', href: '/admin/analytics', icon: '/svgs/analytics.svg', label: 'Analytics' },
    { name: 'Profile', href: '/admin/profile', icon: '/svgs/profile.svg', label: 'Profile' },
    
    // Blog Section
    { name: 'Blog Posts', href: '/admin/blog', icon: '/svgs/blog.svg', label: 'Blog Posts' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: '/svgs/category.svg', label: 'Blog Categories' },
    
    // Content Section
    { name: 'Testimonials', href: '/admin/testimonials', icon: '/svgs/testimonials.svg', label: 'Testimonials' },
    { name: 'Team Members', href: '/admin/team', icon: '/svgs/team.svg', label: 'Team Members' },
    { name: 'Hero Section', href: '/admin/hero', icon: '/svgs/hero.svg', label: 'Hero Section' },
    { name: 'About Section', href: '/admin/about', icon: '/svgs/about.svg', label: 'About Section' },
    { name: 'Services', href: '/admin/services', icon: '/svgs/services.svg', label: 'Services' },
    { name: 'Projects', href: '/admin/projects', icon: '/svgs/projects.svg', label: 'Projects' },
    { name: 'FAQs', href: '/admin/faqs', icon: '/svgs/faq.svg', label: 'FAQs' },
    { name: 'Call to Action', href: '/admin/cta', icon: '/svgs/cta.svg', label: 'Call to Action' },
    
    // Navigation Section
    { name: 'Navigation Menu', href: '/admin/menu', icon: '/svgs/menu.svg', label: 'Navigation Menu' },
    { name: 'Footer', href: '/admin/footer', icon: '/svgs/footer.svg', label: 'Footer' },
    
    // Media Section
    { name: 'Image Gallery', href: '/admin/images', icon: '/svgs/gallery.svg', label: 'Image Gallery' },
    
    // Newsletter Section
    { name: 'Subscribers', href: '/admin/subscribers', icon: '/svgs/subscribers.svg', label: 'Subscribers' },
    { name: 'Newsletter', href: '/admin/newsletter', icon: '/svgs/newsletter.svg', label: 'Newsletter' },
    
    // SEO Section
    { name: 'SEO Tools', href: '/admin/seo', icon: '/svgs/seo.svg', label: 'SEO Tools' },
    
    // Data Section
    { name: 'Export Data', href: '/admin/export', icon: '/svgs/export.svg', label: 'Export Data' },
    { name: 'Backup', href: '/admin/backup', icon: '/svgs/backup.svg', label: 'Backup & Restore' },
    
    // Settings Section
    { name: 'Email Settings', href: '/admin/email-settings', icon: '/svgs/email.svg', label: 'Email Settings' },
    { name: 'Site Settings', href: '/admin/settings', icon: '/svgs/settings.svg', label: 'Site Settings' },
    { name: 'Messages', href: '/admin/messages', icon: '/svgs/messages.svg', label: 'Messages' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside 
          className={`fixed left-0 top-0 h-full bg-gradient-to-b from-[#0A1D37] to-[#1a2a4a] text-white transition-all duration-300 z-20 flex flex-col ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          {/* Logo Area */}
          <div className={`p-5 border-b border-white/10 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8">
                    <Image
                      src="/svgs/admin-logo.svg"
                      alt="Admin Panel"
                      width={32}
                      height={32}
                      className="w-full h-full brightness-0 invert"
                    />
                  </div>
                  <span className="font-bold text-lg">Admin Panel</span>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="text-white/50 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="text-white/50 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    isActive 
                      ? 'bg-white/10 border-l-4 border-white' 
                      : 'hover:bg-white/5'
                  } ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
                  style={{ borderLeftColor: isActive ? 'white' : 'transparent' }}
                >
                  <div className="w-5 h-5 flex-shrink-0">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      width={20}
                      height={20}
                      className="w-full h-full brightness-0 invert"
                    />
                  </div>
                  {sidebarOpen && (
                    <span className="text-sm truncate">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile Area - Sticky at bottom */}
          <div className={`p-4 border-t border-white/10 ${sidebarOpen ? 'block' : 'text-center'} mt-auto`}>
            <Link href="/admin/profile" className="flex items-center gap-3 hover:bg-white/5 rounded-lg transition p-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-white/50 truncate">{user?.email}</p>
                </div>
              )}
            </Link>
            <button 
              onClick={handleLogout}
              className={`w-full mt-2 text-white/50 hover:text-white transition text-sm ${sidebarOpen ? 'text-left px-2' : 'text-center'}`}
            >
              {sidebarOpen ? 'Logout →' : '🚪'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main 
          className={`transition-all duration-300 min-h-screen ${
            sidebarOpen ? 'ml-64' : 'ml-20'
          }`}
        >
          {/* Top Header */}
          <div className="sticky top-0 z-10 bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {navItems.find(item => item.href === pathname)?.label || 'Admin Panel'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Link href="/admin/profile" className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}