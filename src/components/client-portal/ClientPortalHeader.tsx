// src/components/client-portal/ClientPortalHeader.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientPortalHeaderProps {
  client: any
  sidebarOpen: boolean
  onMenuClick: () => void
}

export default function ClientPortalHeader({ client, sidebarOpen, onMenuClick }: ClientPortalHeaderProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/client-login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-section)] transition"
          >
            <SvgIcon name="menu" size={20} color="var(--text-primary)" />
          </button>

          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {client?.business_name || 'Client Portal'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--bg-section)] transition">
            <SvgIcon name="bell" size={20} color="var(--text-muted)" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-[var(--bg-section)] transition"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-orange)] text-white font-semibold text-sm">
                {client?.profile_image ? (
                  <img 
                    src={client.profile_image} 
                    alt="Profile" 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  client?.full_name?.charAt(0) || 'C'
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)]">
                {client?.full_name || 'Client'}
              </span>
              <SvgIcon name="chevron-down" size={16} color="var(--text-muted)" className="hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white p-3 shadow-lg z-50">
                  <div className="border-b border-[var(--border)] pb-3">
                    <p className="text-xs font-medium text-[var(--text-muted)]">Signed in as</p>
                    <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{client?.email}</p>
                  </div>
                  <Link
                    href="/client-portal/settings"
                    onClick={() => setProfileOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)] transition"
                  >
                    <SvgIcon name="settings" size={16} color="var(--text-muted)" />
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    <SvgIcon name="logout" size={16} color="#ef4444" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}