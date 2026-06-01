'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export default function NewFAQ() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('General')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (question.trim().length < 8) { setMessage('Question is too short.'); setLoading(false); return }
    if (answer.trim().length < 25) { setMessage('Answer should be more detailed.'); setLoading(false); return }

    const { error } = await supabase.from('faqs').insert([{
      question: question.trim(),
      answer: answer.trim(),
      category: category,
      display_order: displayOrder,
      is_active: isActive,
    }])

    if (error) setMessage('Error: ' + error.message)
    else router.push('/admin/faqs')

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Create New FAQ</h2><p className="text-sm text-[var(--text-secondary)]">Add helpful questions and answers.</p></div>
        <Link href="/admin/faqs" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link>
      </div>

      {message && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Question *</label><input type="text" required value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" placeholder="e.g., How long does a website project take?" /></div>
        <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Answer *</label><textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" placeholder="Write a clear and helpful answer." /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Category</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" placeholder="General, Services, Pricing..." /></div>
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Display Order</label><input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active / visible on website</label>
        <div className="flex gap-3 pt-4"><button type="submit" disabled={loading} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{loading ? 'Saving...' : 'Create FAQ'}</button><Link href="/admin/faqs" className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black">Cancel</Link></div>
      </form>
    </div>
  )
}