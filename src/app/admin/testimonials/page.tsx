'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SvgIcon from '@/components/ui/SvgIcon'

interface Testimonial {
  id: string
  name: string
  position: string
  company: string
  content: string
  rating: number
  image_url: string
  display_order: number
  is_active: boolean
  created_at: string
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '', position: '', company: '', content: '', rating: 5, image_url: '', display_order: 0, is_active: true
  })
  const router = useRouter()

  useEffect(() => { checkAuth(); fetchTestimonials() }, [])

  const checkAuth = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) router.push('/admin/login') }

  const fetchTestimonials = async () => {
    const { data } = await supabase.from('testimonials').select('*').order('display_order')
    setTestimonials(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ name: '', position: '', company: '', content: '', rating: 5, image_url: '', display_order: 0, is_active: true })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editingItem) {
      await supabase.from('testimonials').update(formData).eq('id', editingItem.id)
    } else {
      await supabase.from('testimonials').insert([formData])
    }
    await fetchTestimonials()
    resetForm()
    setSaving(false)
  }

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item)
    setFormData({
      name: item.name, position: item.position || '', company: item.company || '',
      content: item.content, rating: item.rating, image_url: item.image_url || '',
      display_order: item.display_order, is_active: item.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this testimonial?')) {
      await supabase.from('testimonials').delete().eq('id', id)
      await fetchTestimonials()
    }
  }

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('testimonials').update({ is_active: !current }).eq('id', id)
    await fetchTestimonials()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Testimonials</h2><p className="text-sm text-[var(--text-secondary)]">Manage client testimonials.</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)]">+ New Testimonial</button>}
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black">{editingItem ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold">Name *</label><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Position</label><input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold">Company</label><input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Rating (1-5)</label><select value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"><option value={5}>★★★★★ (5)</option><option value={4}>★★★★☆ (4)</option><option value={3}>★★★☆☆ (3)</option></select></div>
            </div>
            <div><label className="mb-1 block text-sm font-bold">Image URL (optional)</label><input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <div><label className="mb-1 block text-sm font-bold">Testimonial Content *</label><textarea required rows={4} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold">Display Order</label><input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div className="flex items-center gap-4 pt-7"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} /> Active on website</label></div>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</button><button type="button" onClick={resetForm} className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {testimonials.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex gap-4">
              {item.image_url && <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0"><Image src={item.image_url} alt={item.name} width={48} height={48} className="object-cover" /></div>}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold">{item.name}</h3>{item.position && <span className="text-sm text-[var(--text-muted)]">{item.position}</span>}{item.company && <span className="text-sm text-[var(--text-muted)]">at {item.company}</span>}</div>
                <div className="flex gap-0.5 mt-1">{[...Array(item.rating)].map((_, i) => <span key={i} className="text-yellow-400">★</span>)}</div>
                <p className="mt-2 text-sm italic text-[var(--text-secondary)]">"{item.content}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleStatus(item.id, item.is_active)} className={`rounded-lg px-2 py-1 text-xs font-bold ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{item.is_active ? 'Active' : 'Inactive'}</button>
                <button onClick={() => handleEdit(item)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">No testimonials yet.</div>}
      </div>
    </div>
  )
}