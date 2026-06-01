'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

interface Subscriber {
  id: string
  email: string
  name: string
  status: string
  subscribed_at: string
  source: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchSubscribers()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchSubscribers = async () => {
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })
    
    setSubscribers(data || [])
    const active = data?.filter(s => s.status === 'active').length || 0
    const unsubscribed = data?.filter(s => s.status === 'unsubscribed').length || 0
    setStats({ total: data?.length || 0, active, unsubscribed })
    setLoading(false)
  }

  const handleUnsubscribe = async (id: string, email: string) => {
    if (confirm(`Unsubscribe ${email}?`)) {
      const { error } = await supabase
        .from('subscribers')
        .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) fetchSubscribers()
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`Delete ${email} permanently?`)) {
      await supabase.from('subscribers').delete().eq('id', id)
      fetchSubscribers()
    }
  }

  const exportToCSV = () => {
    const filtered = getFilteredSubscribers()
    const headers = ['Email', 'Name', 'Status', 'Subscribed Date', 'Source']
    const rows = filtered.map(s => [s.email, s.name || '', s.status, new Date(s.subscribed_at).toLocaleDateString(), s.source])
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getFilteredSubscribers = () => {
    let filtered = subscribers
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter)
    if (searchQuery) filtered = filtered.filter(s => s.email.toLowerCase().includes(searchQuery.toLowerCase()) || (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())))
    return filtered
  }

  const filteredSubscribers = getFilteredSubscribers()

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Newsletter Subscribers</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage your email subscriber list</p>
        </div>
        <button onClick={exportToCSV} className="rounded-full bg-[var(--accent)]/10 px-5 py-2 text-sm font-black text-[var(--accent)] transition hover:bg-[var(--accent)]/20">
          <SvgIcon name="download" size={14} color="var(--accent)" className="inline mr-2" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-l-4 border-l-[var(--accent)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Total Subscribers</p>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.total}</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-green-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Active</p>
          <p className="text-3xl font-black text-green-500">{stats.active}</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-red-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Unsubscribed</p>
          <p className="text-3xl font-black text-red-500">{stats.unsubscribed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {/* Subscribers Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <SvgIcon name="email" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">No subscribers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <tr>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Email</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Name</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Subscribed</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Source</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[var(--bg-section)]">
                    <td className="p-4 font-medium text-[var(--text-primary)]">{sub.email}</td>
                    <td className="p-4 text-[var(--text-secondary)]">{sub.name || '-'}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${sub.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">{sub.source || 'website'}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        {sub.status === 'active' && (
                          <button onClick={() => handleUnsubscribe(sub.id, sub.email)} className="text-sm text-orange-400 hover:text-orange-300">
                            Unsubscribe
                          </button>
                        )}
                        <button onClick={() => handleDelete(sub.id, sub.email)} className="text-sm text-red-400 hover:text-red-300">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}