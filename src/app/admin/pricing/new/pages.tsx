'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPricingPackagePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [bestFor, setBestFor] = useState('')
  const [features, setFeatures] = useState('')
  const [ctaText, setCtaText] = useState('Start A Project')
  const [ctaLink, setCtaLink] = useState('/contact')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)

    const featuresArray = features
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('pricing_packages')
      .insert([
        {
          name,
          subtitle,
          price,
          description,
          best_for: bestFor,
          features: featuresArray,
          cta_text: ctaText,
          cta_link: ctaLink,
          display_order: displayOrder,
          is_featured: isFeatured,
          is_active: isActive,
        },
      ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/admin/pricing')
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Admin / Pricing
            </p>

            <h1 className="text-4xl font-black tracking-[-0.05em]">
              Add Pricing Package
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Create a new investment package for the public pricing page.
            </p>
          </div>

          <Link
            href="/admin/pricing"
            className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-5 py-3 text-sm font-black text-white/70"
          >
            Back
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Package Name"
              value={name}
              onChange={setName}
              placeholder="Growth System"
              required
            />

            <Field
              label="Subtitle"
              value={subtitle}
              onChange={setSubtitle}
              placeholder="Most popular package"
            />

            <Field
              label="Price"
              value={price}
              onChange={setPrice}
              placeholder="$1,500+"
            />

            <Field
              label="Best For"
              value={bestFor}
              onChange={setBestFor}
              placeholder="Brands preparing to scale"
            />

            <Field
              label="CTA Text"
              value={ctaText}
              onChange={setCtaText}
              placeholder="Start A Project"
            />

            <Field
              label="CTA Link"
              value={ctaLink}
              onChange={setCtaLink}
              placeholder="/contact"
            />

            <Field
              label="Display Order"
              value={String(displayOrder)}
              onChange={(value) => setDisplayOrder(Number(value))}
              placeholder="1"
              type="number"
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-black text-white">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-4 text-sm text-white outline-none transition focus:border-[#39D97A]/30"
              placeholder="Describe this package..."
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-black text-white">
              Features (one per line)
            </label>

            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={7}
              className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-4 text-sm text-white outline-none transition focus:border-[#39D97A]/30"
              placeholder={`Premium website redesign
Conversion optimization
SEO improvements`}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-5 w-5 rounded border-[#1E314A] bg-[#07111F]"
              />

              <span className="text-sm font-bold text-white/70">
                Featured Package
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded border-[#1E314A] bg-[#07111F]"
              />

              <span className="text-sm font-bold text-white/70">
                Active / Visible
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? 'Saving Package...' : 'Create Pricing Package'}
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
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 text-sm text-white outline-none transition focus:border-[#39D97A]/30"
      />
    </div>
  )
}