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
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [adminName, setAdminName] = useState('')

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'analytics' },
    { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', badge: unreadInquiries },
    { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
    { name: 'Services', href: '/admin/services', icon: 'services' },
    { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
    { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category' },
    { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
    { name: 'Team Members', href: '/admin/team', icon: 'team' },
    { name: 'FAQs', href: '/admin/faqs', icon: 'faq' },
    { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
    { name: 'About Page', href: '/admin/about', icon: 'about' },
    { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
    { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter' },
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
        const name = data.user?.user_metadata?.full_name || 'Admin'
        setAdminName(name)
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
  }, [pathname, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '280px' : '80px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'var(--accent)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>H</span>
              </div>
              {sidebarOpen && <span style={{ fontWeight: 'bold' }}>Hbee Digitals</span>}
            </Link>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* SCROLLABLE NAVIGATION - This is the key fix */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px',
        }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                marginBottom: '4px',
                borderRadius: '8px',
                backgroundColor: pathname === item.href ? 'var(--accent)' : 'transparent',
                color: pathname === item.href ? 'white' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <SvgIcon name={item.icon} size={18} color={pathname === item.href ? 'white' : 'var(--text-muted)'} />
              {sidebarOpen && <span>{item.name}</span>}
              {item.badge && item.badge > 0 && sidebarOpen && (
                <span style={{ marginLeft: 'auto', background: 'red', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '10px' }}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{adminName.charAt(0)}</span>
            </div>
            {sidebarOpen && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{adminName}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {sidebarOpen ? 'Logout' : '←'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-page)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-page)',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
          </h1>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}