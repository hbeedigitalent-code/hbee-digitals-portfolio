'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditEmailTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [form, setForm] = useState({
    name: '', slug: '', subject: '', preheader: '', body_html: '', body_text: '',
    from_name: 'Hbee Digitals', from_email: 'noreply@hbeedigitals.com', reply_to: 'hello@hbeedigitals.com', is_active: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { if (id) fetchTemplate() }, [id])

  async function fetchTemplate() {
    const { data } = await supabase.from('email_templates').select('*').eq('id', id).single()
    if (data) setForm(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('email_templates').update({ ...form, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Template updated!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDelete() {
    if (confirm('Delete this template?')) {
      await supabase.from('email_templates').delete().eq('id', id)
      router.push('/admin/email-templates')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-[var(--text-primary)]">Edit Email Template</h2></div><Link href="/admin/email-templates" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link></div>
      {message && <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-3 text-sm text-[var(--accent)]">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-4 md:grid-cols-2"><input type="text" required placeholder="Template Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input type="text" required placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <input type="text" required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <div className="grid gap-4 md:grid-cols-3"><input type="text" placeholder="From Name" value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input type="email" placeholder="From Email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input type="email" placeholder="Reply To" value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <textarea placeholder="Preheader" rows={2} value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <textarea placeholder="HTML Body" rows={10} value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono" />
        <textarea placeholder="Plain Text Body" rows={5} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <div className="flex gap-3"><button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Update'}</button><button type="button" onClick={handleDelete} className="rounded-full border border-red-500/30 px-6 py-2 text-sm font-black text-red-400">Delete</button></div>
      </form>
    </div>
  )
}