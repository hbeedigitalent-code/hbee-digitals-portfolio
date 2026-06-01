'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  display_order: number
  is_active: boolean
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchFaqs()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchFaqs = async () => {
    const { data } = await supabase.from('faqs').select('*').order('display_order', { ascending: true })
    setFaqs(data || [])
    setLoading(false)
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('faqs').update({ is_active: !currentStatus }).eq('id', id)
    fetchFaqs()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this FAQ?')) {
      await supabase.from('faqs').delete().eq('id', id)
      fetchFaqs()
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">FAQs Management</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage frequently asked questions.</p>
        </div>
        <Link href="/admin/faqs/new" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]">
          + New FAQ
        </Link>
      </div>

      {message && <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4 text-sm text-[var(--accent)]">{message}</div>}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {faqs.length === 0 ? (
          <div className="p-12 text-center"><SvgIcon name="faq" size={48} color="var(--text-muted)" /><p className="mt-4 text-[var(--text-secondary)]">No FAQs yet.</p></div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr><th className="p-4 text-left text-xs font-bold">Question</th><th className="p-4 text-left text-xs font-bold">Category</th><th className="p-4 text-center text-xs font-bold">Order</th><th className="p-4 text-center text-xs font-bold">Status</th><th className="p-4 text-center text-xs font-bold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {faqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-[var(--bg-section)]">
                  <td className="p-4 max-w-md"><p className="font-medium truncate">{faq.question}</p></td>
                  <td className="p-4"><span className="rounded-full bg-[var(--accent)]/10 px-2 py-1 text-xs text-[var(--accent)]">{faq.category || 'General'}</span></td>
                  <td className="p-4 text-center text-sm">{faq.display_order}</td>
                  <td className="p-4 text-center"><button onClick={() => toggleStatus(faq.id, faq.is_active)} className={`rounded-full px-2 py-1 text-xs font-bold ${faq.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{faq.is_active ? 'Active' : 'Draft'}</button></td>
                  <td className="p-4 text-center"><div className="flex justify-center gap-2"><Link href={`/admin/faqs/${faq.id}`} className="text-sm text-[var(--accent)]">Edit</Link><button onClick={() => handleDelete(faq.id)} className="text-sm text-red-400">Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}