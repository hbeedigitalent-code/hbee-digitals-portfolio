'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientPortalLayoutProps {
  children: ReactNode
  clientName: string
  businessName: string
}

const navItems = [
  { name: 'Dashboard', href: '/client-portal', icon: 'dashboard' },
  { name: 'Projects', href: '/client-portal/projects', icon: 'projects' },
  { name: 'Files', href: '/client-portal/files', icon: 'file' },
  { name: 'Requests', href: '/client-portal/requests', icon: 'messages' },
  { name: 'Deliverables', href: '/client-portal/deliverables', icon: 'download' },
  { name: 'Invoices', href: '/client-portal/invoices', icon: 'pricing' },
]

export function ClientPortalLayout({ children, clientName, businessName }: ClientPortalLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/client-login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-navy)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-[var(--border)] bg-[var(--bg-card-dark)]">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
          <SvgIcon name="logo" size={32} color="var(--accent-orange)" />
          <span className="text-lg font-bold text-white">Client Portal</span>
        </div>

        <div className="p-4">
          <div className="mb-6 rounded-lg bg-[var(--bg-navy-mid)] p-4">
            <p className="text-sm font-medium text-white">{clientName}</p>
            <p className="text-xs text-[var(--text-muted)]">{businessName}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-navy-mid)] hover:text-white'
                  }`}
                >
                  <SvgIcon name={item.icon} size={18} color={isActive ? 'var(--accent-orange)' : 'var(--text-muted)'} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-navy-mid)] hover:text-white"
          >
            <SvgIcon name="logout" size={18} color="var(--text-muted)" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <div className="min-h-screen p-8">
          {children}
        </div>
      </main>
    </div>
  )
}