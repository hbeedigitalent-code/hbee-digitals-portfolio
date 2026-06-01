'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

interface SEOSetting {
  id: string
  page_url: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_title: string
  og_description: string
  og_image: string
  canonical_url: string
  no_index: boolean
  no_follow: boolean
}

export default function SEOToolsPage() {
  const [settings, setSettings] = useState<SEOSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<SEOSetting | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [generatingSitemap, setGeneratingSitemap] = useState(false)
  const router = useRouter()
  const [formData, setFormData] = useState({
    page_url: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    no_index: false,
    no_follow: false
  })

  useEffect(() => {
    checkAuth()
    fetchSettings()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('seo_settings').select('*').order('page_url')
    setSettings(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      page_url: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      canonical_url: '',
      no_index: false,
      no_follow: false
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    if (editingItem) {
      const { error } = await supabase.from('seo_settings').update(formData).eq('id', editingItem.id)
      if (error) setMessage(`Error: ${error.message}`)
      else { setMessage('SEO settings updated!'); fetchSettings(); resetForm() }
    } else {
      const { error } = await supabase.from('seo_settings').insert([formData])
      if (error) setMessage(`Error: ${error.message}`)
      else { setMessage('SEO settings created!'); fetchSettings(); resetForm() }
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleEdit = (item: SEOSetting) => {
    setEditingItem(item)
    setFormData({
      page_url: item.page_url,
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
      og_title: item.og_title || '',
      og_description: item.og_description || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || '',
      no_index: item.no_index || false,
      no_follow: item.no_follow || false
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this SEO setting?')) {
      await supabase.from('seo_settings').delete().eq('id', id)
      fetchSettings()
    }
  }

  const generateSitemap = async () => {
    setGeneratingSitemap(true)
    try {
      const response = await fetch('/api/sitemap', { method: 'POST' })
      if (response.ok) setMessage('Sitemap generated successfully!')
      else throw new Error('Failed')
    } catch {
      setMessage('Failed to generate sitemap')
    } finally {
      setGeneratingSitemap(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">SEO Tools</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage meta tags and generate sitemap.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={generateSitemap} disabled={generatingSitemap} className="rounded-full border border-[var(--accent)]/30 px-4 py-2 text-sm font-black text-[var(--accent)]">
            {generatingSitemap ? 'Generating...' : 'Generate Sitemap'}
          </button>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)]">
              + Add Page SEO
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black">{editingItem ? 'Edit SEO' : 'Add SEO'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingItem && <input type="text" required value={formData.page_url} onChange={(e) => setFormData({ ...formData, page_url: e.target.value })} placeholder="/page-url" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />}
            <input type="text" value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} placeholder="Meta Title (50-60 chars)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            <textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={2} placeholder="Meta Description (150-160 chars)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            <input type="text" value={formData.meta_keywords} onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })} placeholder="Meta Keywords (comma separated)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            <div className="grid gap-4 md:grid-cols-2">
              <input type="text" value={formData.og_title} onChange={(e) => setFormData({ ...formData, og_title: e.target.value })} placeholder="OG Title" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
              <input type="text" value={formData.og_image} onChange={(e) => setFormData({ ...formData, og_image: e.target.value })} placeholder="OG Image URL" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <textarea value={formData.og_description} onChange={(e) => setFormData({ ...formData, og_description: e.target.value })} rows={2} placeholder="OG Description" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            <input type="text" value={formData.canonical_url} onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })} placeholder="Canonical URL" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.no_index} onChange={(e) => setFormData({ ...formData, no_index: e.target.checked })} /> No Index</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.no_follow} onChange={(e) => setFormData({ ...formData, no_follow: e.target.checked })} /> No Follow</label>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</button>
              <button type="button" onClick={resetForm} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-black">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
            <tr><th className="p-3 text-left text-xs font-bold">Page</th><th className="p-3 text-left text-xs font-bold">Meta Title</th><th className="p-3 text-left text-xs font-bold">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {settings.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--bg-section)]">
                <td className="p-3 font-mono text-sm">{item.page_url}</td>
                <td className="p-3 max-w-xs truncate text-sm">{item.meta_title || '-'}</td>
                <td className="p-3"><button onClick={() => handleEdit(item)} className="text-sm text-[var(--accent)]">Edit</button> <button onClick={() => handleDelete(item.id)} className="ml-3 text-sm text-red-400">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-300">
        <p className="font-bold">SEO Best Practices:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Meta titles: 50-60 characters</li>
          <li>Meta descriptions: 150-160 characters</li>
          <li>Generate sitemap after adding new content</li>
          <li>Submit sitemap to Google Search Console</li>
        </ul>
      </div>
    </div>
  )
}