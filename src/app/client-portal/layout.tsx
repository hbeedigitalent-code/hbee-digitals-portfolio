// src/app/client-portal/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import ClientPortalSidebar from '@/components/client-portal/ClientPortalSidebar'
import ClientPortalHeader from '@/components/client-portal/ClientPortalHeader'

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/client-login')
        return
      }

      // Get client profile
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)
      }

      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      {/* Sidebar */}
      <ClientPortalSidebar 
        client={client}
        pathname={pathname}
        isOpen={sidebarOpen}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <ClientPortalHeader 
          client={client}
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}