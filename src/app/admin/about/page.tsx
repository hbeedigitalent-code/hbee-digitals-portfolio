'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
      }

      setLoading(false)
    }

    fetchAboutPage()
  }, [])

  function updateField(
    field: keyof AboutPageData,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop()
    const fileName = `about/founder-${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      setMessage(`Image upload failed: ${error.message}`)
      setUploading(false)
      return
    }

    setForm((prev) => ({
      ...prev,
      founder_image: fileName,
    }))

    setMessage('Founder image uploaded successfully.')
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
      }
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-white/60">Loading About page settings...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Admin / About Page
          </p>

          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Manage About Page Content
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Update the public About page content, founder section, philosophy,
            and authority messaging from here.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        <div className="space-y-6">
          <AdminCard title="Hero Section">
            <Input
              label="Hero Badge"
              value={form.hero_badge}
              onChange={(value) => updateField('hero_badge', value)}
            />

            <Textarea
              label="Hero Title"
              value={form.hero_title}
              onChange={(value) => updateField('hero_title', value)}
              rows={3}
            />

            <Textarea
              label="Hero Description"
              value={form.hero_description}
              onChange={(value) => updateField('hero_description', value)}
              rows={5}
            />
          </AdminCard>

          <AdminCard title="Founder Section">
            <Input
              label="Founder Title"
              value={form.founder_title}
              onChange={(value) => updateField('founder_title', value)}
            />

            <Textarea
              label="Founder Description"
              value={form.founder_description}
              onChange={(value) => updateField('founder_description', value)}
              rows={6}
            />

            <div>
              <label className="mb-2 block text-sm font-bold text-white/70">
                Founder Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                className="block w-full cursor-pointer rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3 text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-[#39D97A] file:px-4 file:py-2 file:text-sm file:font-black file:text-[#06101F]"
              />

              {uploading && (
                <p className="mt-2 text-sm text-[#39D97A]">
                  Uploading image...
                </p>
              )}

              {form.founder_image && (
                <p className="mt-2 break-all text-xs text-white/45">
                  Current image path: {form.founder_image}
                </p>
              )}
            </div>
          </AdminCard>

          <AdminCard title="Philosophy Section">
            <Textarea
              label="Philosophy Title"
              value={form.philosophy_title}
              onChange={(value) => updateField('philosophy_title', value)}
              rows={3}
            />

            <Textarea
              label="Philosophy Description One"
              value={form.philosophy_description_one}
              onChange={(value) =>
                updateField('philosophy_description_one', value)
              }
              rows={4}
            />

            <Textarea
              label="Philosophy Description Two"
              value={form.philosophy_description_two}
              onChange={(value) =>
                updateField('philosophy_description_two', value)
              }
              rows={4}
            />
          </AdminCard>

          <AdminCard title="Visibility">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="h-5 w-5 rounded border-[#1E314A] accent-[#39D97A]"
              />

              <span className="text-sm font-bold text-white/70">
                Make this About page content active
              </span>
            </label>
          </AdminCard>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save About Page'}
          </button>
        </div>
      </div>
    </main>
  )
}

function AdminCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="mb-5 text-xl font-black tracking-[-0.035em] text-white">
        {title}
      </h2>

      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#39D97A]/40"
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>

      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#39D97A]/40"
      />
    </div>
  )
}