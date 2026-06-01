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
  founder_title: string
  founder_description: string
  founder_image?: string
  is_active: boolean
}

const defaultForm: AboutPageData = {
  hero_badge: 'About Hbee Digitals',
  hero_title:
    'We build digital systems designed to increase trust, conversion, and long-term growth.',
  hero_description:
    'Hbee Digitals helps ambitious brands improve how they present, position, and scale online through conversion-focused websites, ecommerce systems, strategic UX, and premium digital experiences built for long-term growth.',
  philosophy_title: 'Most brands do not struggle because of bad products.',
  philosophy_description_one:
    'They struggle because their websites, branding, and customer experience fail to communicate trust clearly enough.',
  philosophy_description_two:
    'At Hbee Digitals, we focus on building structured digital systems that improve perception, simplify customer experience, and support sustainable growth across every interaction.',
  founder_title: 'Founder-led digital growth, built with strategy first.',
  founder_description:
    'Hbee Digitals was created to help brands move beyond simply having an online presence and start building digital systems that support real business growth.',
  founder_image: '',
  is_active: true,
}

export default function AdminAboutPage() {
  const [form, setForm] = useState<AboutPageData>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    async function fetchAboutPage() {
      const { data, error } = await supabase
        .from('about_page')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setForm({
          ...defaultForm,
          ...data,
        })
        // Set preview URL if founder_image exists
        if (data.founder_image) {
          const { data: urlData } = supabase.storage
            .from('project-images')
            .getPublicUrl(data.founder_image)
          setPreviewUrl(urlData.publicUrl)
        }
      }

      setLoading(false)
    }

    fetchAboutPage()
  }, [])

  function updateField(field: keyof AboutPageData, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    setMessage('')

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file (JPG, PNG, GIF, WEBP)')
      setUploading(false)
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be less than 5MB')
      setUploading(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `about/founder-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      setMessage(`Image upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName)

    setForm((prev) => ({
      ...prev,
      founder_image: fileName,
    }))
    setPreviewUrl(urlData.publicUrl)
    setMessage('Founder image uploaded successfully. Click Save to apply.')
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
      founder_title: form.founder_title,
      founder_description: form.founder_description,
      founder_image: form.founder_image || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (form.id) {
      const { error } = await supabase
        .from('about_page')
        .update(payload)
        .eq('id', form.id)

      if (error) {
        setMessage(`Save failed: ${error.message}`)
      } else {
        setMessage('About page updated successfully.')
        setTimeout(() => setMessage(''), 3000)
      }
    } else {
      const { data, error } = await supabase
        .from('about_page')
        .insert(payload)
        .select()
        .single()

      if (error) {
        setMessage(`Save failed: ${error.message}`)
      } else {
        setForm({
          ...form,
          id: data.id,
        })
        setMessage('About page created successfully.')
        setTimeout(() => setMessage(''), 3000)
      }
    }

    setSaving(false)
  }

  async function handleRemoveImage() {
    if (!form.founder_image) return

    if (confirm('Remove the founder image?')) {
      setUploading(true)
      
      // Delete from storage
      await supabase.storage
        .from('project-images')
        .remove([form.founder_image])

      setForm((prev) => ({
        ...prev,
        founder_image: '',
      }))
      setPreviewUrl('')
      setMessage('Image removed. Click Save to apply changes.')
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">About Page</h2>
        <p className="text-sm text-[var(--text-secondary)]">Manage your about page content, founder section, and philosophy.</p>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.includes('failed') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
        {/* Hero Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Hero Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Hero Badge</label>
              <input value={form.hero_badge} onChange={(e) => updateField('hero_badge', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Hero Title</label>
              <textarea rows={3} value={form.hero_title} onChange={(e) => updateField('hero_title', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Hero Description</label>
              <textarea rows={5} value={form.hero_description} onChange={(e) => updateField('hero_description', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
          </div>
        </div>

        {/* Founder Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Founder Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Founder Title</label>
              <input value={form.founder_title} onChange={(e) => updateField('founder_title', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Founder Description</label>
              <textarea rows={6} value={form.founder_description} onChange={(e) => updateField('founder_description', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Founder Image</label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                  className="block w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-xs file:font-black file:text-[var(--btn-primary-text)]"
                />
                {uploading && <p className="text-sm text-[var(--accent)]">Uploading...</p>}
                {previewUrl && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2">
                    <img src={previewUrl} alt="Founder preview" className="mx-auto max-h-32 rounded object-contain" />
                    <button type="button" onClick={handleRemoveImage} className="mt-2 w-full rounded-lg border border-red-500/30 py-1 text-sm text-red-400 hover:bg-red-500/10">
                      Remove Image
                    </button>
                  </div>
                )}
                {form.founder_image && !previewUrl && <p className="text-xs text-[var(--text-muted)]">Path: {form.founder_image}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Philosophy Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Philosophy Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Philosophy Title</label>
              <textarea rows={3} value={form.philosophy_title} onChange={(e) => updateField('philosophy_title', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Description One</label>
              <textarea rows={4} value={form.philosophy_description_one} onChange={(e) => updateField('philosophy_description_one', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Description Two</label>
              <textarea rows={4} value={form.philosophy_description_two} onChange={(e) => updateField('philosophy_description_two', e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]" />
            <span className="text-sm font-bold text-[var(--text-secondary)]">Make this About page content active on the website</span>
          </label>
        </div>

        {/* Save Button */}
        <button type="submit" disabled={saving} className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50">
          {saving ? 'Saving...' : 'Save About Page'}
        </button>
      </form>
    </div>
  )
}