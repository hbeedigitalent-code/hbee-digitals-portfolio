// src/components/client-portal/ClientPortalSidebar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientPortalSidebarProps {
  client: any
  pathname: string
  isOpen: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  onToggle: () => void
}

const navItems = [
  { name: 'Dashboard', href: '/client-portal', icon: 'dashboard' },
  { name: 'Projects', href: '/client-portal/projects', icon: 'projects' },
  { name: 'Files', href: '/client-portal/files', icon: 'file' },
  { name: 'Requests', href: '/client-portal/requests', icon: 'messages' },
  { name: 'Deliverables', href: '/client-portal/deliverables', icon: 'download' },
  { name: 'Invoices', href: '/client-portal/invoices', icon: 'pricing' },
  { name: 'Settings', href: '/client-portal/settings', icon: 'settings' },
]

export default function ClientPortalSidebar({
  client,
  pathname,
  isOpen,
  mobileOpen,
  onMobileClose,
  onToggle,
}: ClientPortalSidebarProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/client-login')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
        <Link href="/client-portal" className="flex items-center gap-2">
          <SvgIcon name="logo" size={32} color="var(--accent-orange)" />
          <span className="text-lg font-bold text-[var(--text-primary)]">Client Portal</span>
        </Link>
        <button
          onClick={onToggle}
          className="hidden lg:block text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Client Info */}
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] font-semibold">
            {client?.full_name?.charAt(0) || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {client?.full_name || 'Client'}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {client?.business_name || 'No business'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onMobileClose()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
              } ${!isOpen ? 'lg:justify-center' : ''}`}
            >
              <SvgIcon 
                name={item.icon} 
                size={18} 
                color={isActive ? 'var(--accent-orange)' : 'var(--text-muted)'} 
              />
              {isOpen && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-[var(--border)] p-3">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)] ${!isOpen ? 'lg:justify-center' : ''}`}
        >
          <SvgIcon name="logout" size={18} color="var(--text-muted)" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed inset-y-0 left-0 z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}