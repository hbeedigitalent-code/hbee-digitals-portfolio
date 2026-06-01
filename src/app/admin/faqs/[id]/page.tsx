'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditFAQ() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('General')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchFAQ()
  }, [id])

  const fetchFAQ = async () => {
    const { data } = await supabase.from('faqs').select('*').eq('id', id).single()
    if (data) {
      setQuestion(data.question || '')
      setAnswer(data.answer || '')
      setCategory(data.category || 'General')
      setDisplayOrder(data.display_order || 0)
      setIsActive(data.is_active !== false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('faqs').update({
      question: question.trim(),
      answer: answer.trim(),
      category,
      display_order: displayOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) setMessage('Error: ' + error.message)
    else router.push('/admin/faqs')

    setSaving(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this FAQ?')) {
      await supabase.from('faqs').delete().eq('id', id)
      router.push('/admin/faqs')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Edit FAQ</h2><p className="text-sm text-[var(--text-secondary)]">Update question and answer.</p></div>
        <Link href="/admin/faqs" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link>
      </div>

      {message && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Question *</label><input type="text" required value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Answer *</label><textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Category</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Display Order</label><input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active / visible on website</label>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Update FAQ'}</button>
          <button type="button" onClick={handleDelete} className="rounded-full border border-red-500/30 px-6 py-2 text-sm font-black text-red-400">Delete</button>
          <Link href="/admin/faqs" className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black">Cancel</Link>
        </div>
      </form>
    </div>
  )
}