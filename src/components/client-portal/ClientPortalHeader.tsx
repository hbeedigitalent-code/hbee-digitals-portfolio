// src/components/client-portal/ClientPortalHeader.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientPortalHeaderProps {
  client: any
  sidebarOpen: boolean
  onMenuClick: () => void
}

export default function ClientPortalHeader({ client, sidebarOpen, onMenuClick }: ClientPortalHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-section)]"
          >
            <SvgIcon name="menu" size={20} color="var(--text-primary)" />
          </button>

          {/* Page title */}
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {client?.business_name || 'Client Portal'}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Back to Site
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-[var(--bg-section)] transition"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] font-semibold text-sm">
                {client?.full_name?.charAt(0) || 'C'}
              </div>
              <span className="hidden sm:block text-sm text-[var(--text-primary)]">
                {client?.full_name || 'Client'}
              </span>
              <SvgIcon name="chevron-down" size={16} color="var(--text-muted)" className="hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white p-3 shadow-lg z-50">
                  <p className="text-xs font-medium text-[var(--text-muted)]">Signed in as</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{client?.email}</p>
                  <Link
                    href="/client-portal/settings"
                    onClick={() => setProfileOpen(false)}
                    className="mt-3 block w-full rounded-lg border border-[var(--border)] px-4 py-2 text-center text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-section)] transition"
                  >
                    Profile Settings
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}