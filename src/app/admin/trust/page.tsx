'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminTrustPage() {
  const [form, setForm] = useState({
    badge: 'Trusted by merchants worldwide', headline: 'Built on trust. Delivering results.',
    highlighted_word: 'trust', description: '', stats: '[]', partner_logos: '[]',
    testimonials: '[]', trust_badges: '[]', cta_text: 'Start Your Growth Review',
    cta_link: '/contact', is_active: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { fetchTrustSection() }, [])

  async function fetchTrustSection() {
    const { data } = await supabase.from('trust_section').select('*').single()
    if (data) setForm(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('trust_section').upsert({ ...form, updated_at: new Date().toISOString() })
    setMessage(error ? `Error: ${error.message}` : 'Trust section saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Trust Section</h2><p className="text-sm text-[var(--text-secondary)]">Manage homepage trust signals.</p></div>
      {message && <div className={`rounded-xl border p-3 text-sm ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-4 md:grid-cols-2"><input placeholder="Badge" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input placeholder="Highlighted Word" value={form.highlighted_word} onChange={(e) => setForm({ ...form, highlighted_word: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <input placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <textarea placeholder="Stats JSON" rows={4} value={form.stats} onChange={(e) => setForm({ ...form, stats: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <textarea placeholder="Partner Logos JSON" rows={4} value={form.partner_logos} onChange={(e) => setForm({ ...form, partner_logos: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <textarea placeholder="Testimonials JSON" rows={4} value={form.testimonials} onChange={(e) => setForm({ ...form, testimonials: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <textarea placeholder="Trust Badges JSON" rows={4} value={form.trust_badges} onChange={(e) => setForm({ ...form, trust_badges: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <div className="grid gap-4 md:grid-cols-2"><input placeholder="CTA Text" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input placeholder="CTA Link" value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active on website</label>
        <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Save Trust Section'}</button>
      </form>
    </div>
  )
}