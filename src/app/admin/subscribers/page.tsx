'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchSubscribers = async () => {
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })
    
    setSubscribers(data || [])
    
    // Calculate stats
    const active = data?.filter(s => s.status === 'active').length || 0
    const unsubscribed = data?.filter(s => s.status === 'unsubscribed').length || 0
    setStats({
      total: data?.length || 0,
      active,
      unsubscribed
    })
    setLoading(false)
  }

  const handleUnsubscribe = async (id: string, email: string) => {
    if (confirm(`Unsubscribe ${email}?`)) {
      const { error } = await supabase
        .from('subscribers')
        .update({ 
          status: 'unsubscribed', 
          unsubscribed_at: new Date().toISOString() 
        })
        .eq('id', id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        fetchSubscribers()
      }
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`Delete ${email} permanently?`)) {
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        fetchSubscribers()
      }
    }
  }

  const exportToCSV = () => {
    const filtered = getFilteredSubscribers()
    const headers = ['Email', 'Name', 'Status', 'Subscribed Date', 'Source']
    const rows = filtered.map(s => [
      s.email,
      s.name || '',
      s.status,
      new Date(s.subscribed_at).toLocaleDateString(),
      s.source
    ])
    
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
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    return filtered
  }

  const filteredSubscribers = getFilteredSubscribers()

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading subscribers...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Newsletter Subscribers</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your email subscriber list</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: 'var(--primary-color)' }}>
          <p className="text-sm text-gray-500">Total Subscribers</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-sm text-gray-500">Unsubscribed</p>
          <p className="text-2xl font-bold">{stats.unsubscribed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📧</div>
            <p className="text-gray-500">No subscribers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Subscribed</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Source</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{sub.email}</td>
                    <td className="p-4 text-gray-500">{sub.name || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(sub.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{sub.source}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handleUnsubscribe(sub.id, sub.email)}
                            className="text-orange-600 hover:text-orange-800 text-sm"
                          >
                            Unsubscribe
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(sub.id, sub.email)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
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