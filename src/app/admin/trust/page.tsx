'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TrustSectionForm {
  id?: string
  badge: string
  headline: string
  highlighted_word: string
  description: string
  stats: string
  partner_logos: string
  testimonials: string
  trust_badges: string
  cta_text: string
  cta_link: string
  is_active: boolean
}

const defaultForm: TrustSectionForm = {
  badge: 'Trusted by merchants worldwide',
  headline: 'Built on trust. Delivering results.',
  highlighted_word: 'trust',
  description:
    'We help ambitious brands grow with reliable systems, better user experiences, and conversion-focused digital strategy.',
  stats: '[]',
  partner_logos: '[]',
  testimonials: '[]',
  trust_badges: '[]',
  cta_text: 'Start Your Growth Review',
  cta_link: '/contact',
  is_active: true,
}

function safeJson(value: string) {
  try {
    return JSON.parse(value || '[]')
  } catch {
    throw new Error('One of your JSON fields is invalid. Please check formatting.')
  }
}

function formatJson(value: any) {
  try {
    return JSON.stringify(value || [], null, 2)
  } catch {
    return '[]'
  }
}

export default function AdminTrustPage() {
  const [form, setForm] = useState<TrustSectionForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchTrustSection()
  }, [])

  async function fetchTrustSection() {
    setLoading(true)

    const { data, error } = await supabase
      .from('trust_section')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setForm({
        id: data.id,
        badge: data.badge || defaultForm.badge,
        headline: data.headline || defaultForm.headline,
        highlighted_word: data.highlighted_word || defaultForm.highlighted_word,
        description: data.description || defaultForm.description,
        stats: formatJson(data.stats),
        partner_logos: formatJson(data.partner_logos),
        testimonials: formatJson(data.testimonials),
        trust_badges: formatJson(data.trust_badges),
        cta_text: data.cta_text || defaultForm.cta_text,
        cta_link: data.cta_link || defaultForm.cta_link,
        is_active: data.is_active ?? true,
      })
    }

    setLoading(false)
  }

  function updateField<K extends keyof TrustSectionForm>(
    key: K,
    value: TrustSectionForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const payload = {
        badge: form.badge,
        headline: form.headline,
        highlighted_word: form.highlighted_word,
        description: form.description,
        stats: safeJson(form.stats),
        partner_logos: safeJson(form.partner_logos),
        testimonials: safeJson(form.testimonials),
        trust_badges: safeJson(form.trust_badges),
        cta_text: form.cta_text,
        cta_link: form.cta_link,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }

      const response = form.id
        ? await supabase.from('trust_section').update(payload).eq('id', form.id)
        : await supabase.from('trust_section').insert([payload]).select().single()

      if (response.error) {
        setErrorMessage(response.error.message)
        setSaving(false)
        return
      }

      setMessage('Trust section updated successfully.')
      await fetchTrustSection()
    } catch (error: any) {
      setErrorMessage(error.message || 'Something went wrong.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen text-white">
        <div className="h-72 animate-pulse rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]" />
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Admin / Trust Section
          </p>

          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Trust & Reviews Section
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Manage the homepage trust section, client proof, review cards,
            partner logos, and credibility badges.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 sm:p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Badge"
              value={form.badge}
              onChange={(value) => updateField('badge', value)}
            />

            <Field
              label="Highlighted Word"
              value={form.highlighted_word}
              onChange={(value) => updateField('highlighted_word', value)}
            />
          </div>

          <Field
            label="Headline"
            value={form.headline}
            onChange={(value) => updateField('headline', value)}
          />

          <Textarea
            label="Description"
            value={form.description}
            onChange={(value) => updateField('description', value)}
            rows={4}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="CTA Text"
              value={form.cta_text}
              onChange={(value) => updateField('cta_text', value)}
            />

            <Field
              label="CTA Link"
              value={form.cta_link}
              onChange={(value) => updateField('cta_link', value)}
            />
          </div>

          <JsonField
            label="Stats JSON"
            value={form.stats}
            onChange={(value) => updateField('stats', value)}
            helper='Example: [{"value":"50+","label":"Projects Supported","icon":"users"}]'
          />

          <JsonField
            label="Partner Logos JSON"
            value={form.partner_logos}
            onChange={(value) => updateField('partner_logos', value)}
            helper='Example: [{"name":"Shopify","logo":"/svgs/shopify.svg"}]'
          />

          <JsonField
            label="Testimonials JSON"
            value={form.testimonials}
            onChange={(value) => updateField('testimonials', value)}
            helper='Example: [{"name":"Client Name","role":"Store Owner","quote":"Great work.","rating":5}]'
          />

          <JsonField
            label="Trust Badges JSON"
            value={form.trust_badges}
            onChange={(value) => updateField('trust_badges', value)}
            helper='Example: [{"title":"Secure & Reliable","description":"Professional support.","icon":"security"}]'
          />

          <label className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] p-4">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateField('is_active', e.target.checked)}
              className="h-5 w-5"
            />

            <span className="text-sm font-bold text-white/70">
              Show this section on website
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Trust Section'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({
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
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm text-white outline-none transition focus:border-[#39D97A]/30"
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 text-sm leading-7 text-white outline-none transition focus:border-[#39D97A]/30"
      />
    </div>
  )
}

function JsonField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <textarea
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 font-mono text-xs leading-6 text-white outline-none transition focus:border-[#39D97A]/30"
      />

      {helper && (
        <p className="mt-2 text-xs leading-6 text-white/45">{helper}</p>
      )}
    </div>
  )
}