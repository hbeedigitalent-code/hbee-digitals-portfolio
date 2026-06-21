'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Merchant {
  id: string
  business_name: string
  contact_name: string
  email: string
  whatsapp: string
  website_url: string
  country: string
  industry: string
  status: string
  email_verified: boolean
  created_at: string
}

export default function AdminMerchantsPage() {
  const supabase = createClientComponentClient()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 })

  useEffect(() => {
    fetchMerchants()
  }, [])

  async function fetchMerchants() {
    setLoading(true)

    const { data, error } = await supabase
      .from('merchant_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMerchants(data)
      const total = data.length
      const pending = data.filter((m: any) => m.status === 'pending').length
      const active = data.filter((m: any) => m.status === 'active').length
      setStats({ total, pending, active })
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Merchants</h1>
        <div className="text-sm text-[var(--text-muted)]">
          {merchants.length} total merchants
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-[var(--text-muted)]">Pending</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {merchants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                    No merchants found
                  </td>
                </tr>
              ) : (
                merchants.map((merchant) => (
                  <tr key={merchant.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-dark)]/50">
                    <td className="py-3 font-medium text-white">
                      {merchant.business_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {merchant.contact_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {merchant.email}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        merchant.status === 'active' ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]' :
                        merchant.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {merchant.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(merchant.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}