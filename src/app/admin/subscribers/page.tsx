'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Subscriber {
  id: string
  name: string
  email: string
  phone: string
  source: string
  tags: string[]
  segment: string
  status: string
  last_opened_at: string
  last_clicked_at: string
  created_at: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formSegment, setFormSegment] = useState('lead')
  const [csvData, setCsvData] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSubscribers()
  }, [])

  async function fetchSubscribers() {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    
    setSubscribers(data || [])
    setLoading(false)
  }

  async function addSubscriber(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        name: formName,
        email: formEmail,
        phone: formPhone,
        source: 'manual',
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        segment: formSegment,
        status: 'active',
      }])

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Subscriber added successfully!' })
      setShowAddModal(false)
      resetForm()
      fetchSubscribers()
    }
    setSaving(false)
  }

  async function importSubscribers(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const lines = csvData.split('\n')
    let successCount = 0
    let failCount = 0

    for (const line of lines) {
      if (!line.trim()) continue
      const [email, name, tags] = line.split(',').map(s => s.trim())
      
      if (email && email.includes('@')) {
        const { error } = await supabase
          .from('newsletter_subscribers')
          .upsert([{
            email,
            name: name || null,
            tags: tags ? tags.split(';') : [],
            source: 'csv_import',
            status: 'active',
          }], { onConflict: 'email' })
        
        if (error) failCount++
        else successCount++
      }
    }

    setMessage({ type: 'success', text: `Imported ${successCount} subscribers. Failed: ${failCount}` })
    setShowImportModal(false)
    setCsvData('')
    fetchSubscribers()
    setSaving(false)
  }

  async function exportSubscribers() {
    const headers = ['Name', 'Email', 'Phone', 'Tags', 'Segment', 'Status', 'Created At']
    const rows = subscribers.map(s => [
      s.name || '',
      s.email,
      s.phone || '',
      s.tags?.join(';') || '',
      s.segment || '',
      s.status,
      new Date(s.created_at).toLocaleDateString(),
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status: newStatus })
      .eq('id', id)
    
    if (!error) fetchSubscribers()
  }

  async function deleteSubscriber(id: string) {
    if (!confirm('Delete this subscriber?')) return
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)
    
    if (!error) fetchSubscribers()
  }

  function resetForm() {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormTags('')
    setFormSegment('lead')
  }

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.status === 'active').length,
    leads: subscribers.filter(s => s.segment === 'lead').length,
    clients: subscribers.filter(s => s.segment === 'client').length,
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Subscribers</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage your email list, leads, and client contacts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-5 py-2.5 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
          >
            <SvgIcon name="upload" size={16} color="var(--accent)" />
            Import CSV
          </button>
          <button
            onClick={exportSubscribers}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-5 py-2.5 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
          >
            <SvgIcon name="download" size={16} color="var(--accent)" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-5 py-2.5 text-sm font-black text-white transition hover:scale-105"
          >
            <SvgIcon name="plus" size={16} color="white" />
            Add Subscriber
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
              <SvgIcon name="users" size={20} color="var(--accent)" />
            </div>
            <span className="text-2xl font-black text-[var(--text-primary)]">{stats.total}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Total Subscribers</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <SvgIcon name="verified" size={20} color="#22c55e" />
            </div>
            <span className="text-2xl font-black text-[var(--text-primary)]">{stats.active}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Active</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
              <SvgIcon name="lead" size={20} color="#f97316" />
            </div>
            <span className="text-2xl font-black text-[var(--text-primary)]">{stats.leads}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Leads</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <SvgIcon name="star" size={20} color="#a855f7" />
            </div>
            <span className="text-2xl font-black text-[var(--text-primary)]">{stats.clients}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Clients</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SvgIcon name="search" size={18} color="var(--text-muted)" className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Subscribers Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="min-w-full">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
            <tr>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Name</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Email</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Tags</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Segment</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Status</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Joined</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredSubscribers.map((sub) => (
              <tr key={sub.id} className="hover:bg-[var(--bg-section)]/50">
                <td className="p-4 font-medium text-[var(--text-primary)]">{sub.name || '-'}</td>
                <td className="p-4 text-[var(--text-secondary)]">{sub.email}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {sub.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs text-[var(--accent)]">
                        {tag}
                      </span>
                    ))}
                    {sub.tags?.length > 2 && (
                      <span className="text-xs text-[var(--text-muted)]">+{sub.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                    sub.segment === 'client' ? 'bg-purple-500/20 text-purple-400' :
                    sub.segment === 'lead' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {sub.segment || 'lead'}
                  </span>
                </td>
                <td className="p-4">
                  <select
                    value={sub.status}
                    onChange={(e) => updateStatus(sub.id, e.target.value)}
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      sub.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      sub.status === 'unsubscribed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </td>
                <td className="p-4 text-sm text-[var(--text-muted)]">
                  {new Date(sub.created_at).toLocaleDateString()}
                 </td>
                <td className="p-4">
                  <button
                    onClick={() => deleteSubscriber(sub.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-1 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>

        {filteredSubscribers.length === 0 && (
          <div className="p-12 text-center">
            <SvgIcon name="users" size={48} color="var(--text-muted)" />
            <p className="mt-4 text-[var(--text-muted)]">No subscribers found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-block text-sm font-bold text-[var(--accent)]"
            >
              Add your first subscriber →
            </button>
          </div>
        )}
      </div>

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/75" onClick={() => setShowAddModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-[var(--text-primary)]">Add Subscriber</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)]">✕</button>
            </div>
            <form onSubmit={addSubscriber} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Phone</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Shopify, Ecommerce, Warm Lead"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Segment</label>
                <select
                  value={formSegment}
                  onChange={(e) => setFormSegment(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                >
                  <option value="lead">Lead</option>
                  <option value="client">Client</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gradient-orange-green px-6 py-2 text-sm font-black text-white"
                >
                  {saving ? 'Adding...' : 'Add Subscriber'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black text-[var(--text-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/75" onClick={() => setShowImportModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-[var(--text-primary)]">Import Subscribers (CSV)</h2>
              <button onClick={() => setShowImportModal(false)} className="text-[var(--text-muted)]">✕</button>
            </div>
            <form onSubmit={importSubscribers} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">CSV Data</label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={10}
                  placeholder="email@example.com, John Doe, tag1;tag2&#10;email2@example.com, Jane Smith, shopify;ecommerce"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Format: email, name, tags (semicolon separated). One subscriber per line.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gradient-orange-green px-6 py-2 text-sm font-black text-white"
                >
                  {saving ? 'Importing...' : 'Import Subscribers'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black text-[var(--text-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}