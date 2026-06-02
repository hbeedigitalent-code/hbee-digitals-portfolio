'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface AboutPageData {
  id?: string
  hero_badge: string
  hero_title: string
  hero_description: string
  philosophy_title: string
  philosophy_description_one: string
  philosophy_description_two: string
  about_image?: string
  show_stats: boolean
  show_values: boolean
  is_active: boolean
}

interface AboutStat {
  id: string
  value: string
  label: string
  description: string
  display_order: number
  is_active: boolean
}

interface AboutValue {
  id: string
  title: string
  description: string
  icon: string
  display_order: number
  is_active: boolean
}

const defaultForm: AboutPageData = {
  hero_badge: 'About Hbee Digitals',
  hero_title: 'We build digital systems designed to increase trust, conversion, and long-term growth.',
  hero_description: 'Hbee Digitals helps ambitious brands improve how they present, position, and scale online through conversion-focused websites, ecommerce systems, strategic UX, and premium digital experiences built for long-term growth.',
  philosophy_title: 'Most brands do not struggle because of bad products.',
  philosophy_description_one: 'They struggle because their websites, branding, and customer experience fail to communicate trust clearly enough.',
  philosophy_description_two: 'At Hbee Digitals, we focus on building structured digital systems that improve perception, simplify customer experience, and support sustainable growth across every interaction.',
  about_image: '',
  show_stats: true,
  show_values: true,
  is_active: true,
}

const iconOptions = ['verified', 'users', 'refresh', 'security', 'growth', 'analytics', 'strategy', 'rocket', 'support', 'branding']

export default function AdminAboutPage() {
  const [form, setForm] = useState<AboutPageData>(defaultForm)
  const [stats, setStats] = useState<AboutStat[]>([])
  const [values, setValues] = useState<AboutValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'content' | 'stats' | 'values'>('content')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // Fetch about page content
    const { data: aboutData } = await supabase
      .from('about_page')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (aboutData) {
      setForm({
        ...defaultForm,
        ...aboutData,
      })
      if (aboutData.about_image) {
        const { data: urlData } = supabase.storage
          .from('project-images')
          .getPublicUrl(aboutData.about_image)
        setPreviewUrl(urlData.publicUrl)
      }
    }

    // Fetch stats
    const { data: statsData } = await supabase
      .from('about_stats')
      .select('*')
      .order('display_order', { ascending: true })
    setStats(statsData || [])

    // Fetch values
    const { data: valuesData } = await supabase
      .from('about_values')
      .select('*')
      .order('display_order', { ascending: true })
    setValues(valuesData || [])

    setLoading(false)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file')
      setUploading(false)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be less than 5MB')
      setUploading(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `about/image-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(fileName)
    setForm(prev => ({ ...prev, about_image: fileName }))
    setPreviewUrl(urlData.publicUrl)
    setMessage('Image uploaded. Click Save to apply.')
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const payload = {
      hero_badge: form.hero_badge,
      hero_title: form.hero_title,
      hero_description: form.hero_description,
      philosophy_title: form.philosophy_title,
      philosophy_description_one: form.philosophy_description_one,
      philosophy_description_two: form.philosophy_description_two,
      about_image: form.about_image || null,
      show_stats: form.show_stats,
      show_values: form.show_values,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (form.id) {
      await supabase.from('about_page').update(payload).eq('id', form.id)
    } else {
      const { data } = await supabase.from('about_page').insert(payload).select().single()
      if (data) setForm(prev => ({ ...prev, id: data.id }))
    }

    setMessage('About page saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  // Stats CRUD
  async function addStat() {
    const newStat = { value: '0', label: 'New Stat', description: '', display_order: stats.length, is_active: true }
    const { data } = await supabase.from('about_stats').insert([newStat]).select().single()
    if (data) setStats([...stats, data])
  }

  async function updateStat(id: string, field: keyof AboutStat, value: any) {
    const updated = stats.map(s => s.id === id ? { ...s, [field]: value } : s)
    setStats(updated)
    await supabase.from('about_stats').update({ [field]: value }).eq('id', id)
  }

  async function deleteStat(id: string) {
    if (confirm('Delete this stat?')) {
      await supabase.from('about_stats').delete().eq('id', id)
      setStats(stats.filter(s => s.id !== id))
    }
  }

  // Values CRUD
  async function addValue() {
    const newValue = { title: 'New Value', description: '', icon: 'verified', display_order: values.length, is_active: true }
    const { data } = await supabase.from('about_values').insert([newValue]).select().single()
    if (data) setValues([...values, data])
  }

  async function updateValue(id: string, field: keyof AboutValue, value: any) {
    const updated = values.map(v => v.id === id ? { ...v, [field]: value } : v)
    setValues(updated)
    await supabase.from('about_values').update({ [field]: value }).eq('id', id)
  }

  async function deleteValue(id: string) {
    if (confirm('Delete this value?')) {
      await supabase.from('about_values').delete().eq('id', id)
      setValues(values.filter(v => v.id !== id))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">About Page</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage about page content, stats, and values.</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.includes('failed') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {[
          { id: 'content', label: 'Content' },
          { id: 'stats', label: 'Stats / Achievements' },
          { id: 'values', label: 'Values' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 text-lg font-black">Hero Section</h3>
            <div className="space-y-4">
              <div><label className="mb-1 block text-sm font-bold">Hero Badge</label><input value={form.hero_badge} onChange={(e) => setForm({ ...form, hero_badge: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Hero Title</label><textarea rows={3} value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Hero Description</label><textarea rows={5} value={form.hero_description} onChange={(e) => setForm({ ...form, hero_description: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 text-lg font-black">About Image</h3>
            <div className="space-y-3">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm" />
              {uploading && <p className="text-sm text-[var(--accent)]">Uploading...</p>}
              {previewUrl && <img src={previewUrl} alt="Preview" className="mt-2 max-h-40 rounded-lg object-contain" />}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 text-lg font-black">Philosophy Section</h3>
            <div className="space-y-4">
              <div><label className="mb-1 block text-sm font-bold">Philosophy Title</label><textarea rows={3} value={form.philosophy_title} onChange={(e) => setForm({ ...form, philosophy_title: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Description One</label><textarea rows={4} value={form.philosophy_description_one} onChange={(e) => setForm({ ...form, philosophy_description_one: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Description Two</label><textarea rows={4} value={form.philosophy_description_two} onChange={(e) => setForm({ ...form, philosophy_description_two: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <label className="flex items-center gap-3"><input type="checkbox" checked={form.show_stats} onChange={(e) => setForm({ ...form, show_stats: e.target.checked })} /> Show Stats Section</label>
            <label className="flex items-center gap-3 mt-2"><input type="checkbox" checked={form.show_values} onChange={(e) => setForm({ ...form, show_values: e.target.checked })} /> Show Values Section</label>
            <label className="flex items-center gap-3 mt-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Page Active</label>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Save Content'}</button>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <button onClick={addStat} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-black">+ Add Stat</button>
          {stats.map((stat) => (
            <div key={stat.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <input value={stat.value} onChange={(e) => updateStat(stat.id, 'value', e.target.value)} placeholder="Value" className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                <input value={stat.label} onChange={(e) => updateStat(stat.id, 'label', e.target.value)} placeholder="Label" className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                <input value={stat.description || ''} onChange={(e) => updateStat(stat.id, 'description', e.target.value)} placeholder="Description" className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                <div className="flex gap-2">
                  <input type="number" value={stat.display_order} onChange={(e) => updateStat(stat.id, 'display_order', parseInt(e.target.value))} className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                  <label className="flex items-center gap-1"><input type="checkbox" checked={stat.is_active} onChange={(e) => updateStat(stat.id, 'is_active', e.target.checked)} /> Active</label>
                  <button onClick={() => deleteStat(stat.id)} className="text-red-400">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Values Tab */}
      {activeTab === 'values' && (
        <div className="space-y-4">
          <button onClick={addValue} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-black">+ Add Value</button>
          {values.map((value) => (
            <div key={value.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input value={value.title} onChange={(e) => updateValue(value.id, 'title', e.target.value)} placeholder="Title" className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                <select value={value.icon} onChange={(e) => updateValue(value.id, 'icon', e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2">
                  {iconOptions.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
                <textarea value={value.description} onChange={(e) => updateValue(value.id, 'description', e.target.value)} placeholder="Description" rows={2} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                <div className="flex gap-2 items-center">
                  <input type="number" value={value.display_order} onChange={(e) => updateValue(value.id, 'display_order', parseInt(e.target.value))} className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2" />
                  <label className="flex items-center gap-1"><input type="checkbox" checked={value.is_active} onChange={(e) => updateValue(value.id, 'is_active', e.target.checked)} /> Active</label>
                  <button onClick={() => deleteValue(value.id)} className="text-red-400">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}