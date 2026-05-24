'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PricingPackage {
  id: string
  name: string
  subtitle?: string
  price?: string
  description?: string
  features?: string[]
  best_for?: string
  cta_text?: string
  cta_link?: string
  is_featured?: boolean
  is_active?: boolean
  display_order?: number
}

export default function AdminPricingPage() {
  const [packages, setPackages] = useState<PricingPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPackages()
  }, [])

  async function fetchPackages() {
    const { data } = await supabase
      .from('pricing_packages')
      .select('*')
      .order('display_order', { ascending: true })

    setPackages(data || [])
    setLoading(false)
  }

  async function toggleActive(id: string, value: boolean) {
    await supabase
      .from('pricing_packages')
      .update({
        is_active: !value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    fetchPackages()
  }

  async function toggleFeatured(id: string, value: boolean) {
    await supabase
      .from('pricing_packages')
      .update({
        is_featured: !value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    fetchPackages()
  }

  async function deletePackage(id: string) {
    if (!confirm('Delete this pricing package?')) return

    await supabase
      .from('pricing_packages')
      .delete()
      .eq('id', id)

    fetchPackages()
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Admin / Pricing
            </p>

            <h1 className="text-4xl font-black tracking-[-0.05em]">
              Pricing Packages
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Manage public investment packages shown on the pricing page.
            </p>
          </div>

          <Link
            href="/admin/pricing/new"
            className="inline-flex items-center justify-center rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F]"
          >
            Add New Package
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D]"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {packages.map((item) => (
              <div
                key={item.id}
                className={`rounded-[1.8rem] border p-6 ${
                  item.is_featured
                    ? 'border-[#39D97A]/30 bg-[#39D97A]/10'
                    : 'border-[#1E314A] bg-[#0E1B2D]'
                }`}
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                      {item.subtitle || 'Growth Package'}
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      {item.name}
                    </h2>

                    <p className="mt-3 text-4xl font-black text-white">
                      {item.price || 'Custom'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.is_featured && (
                      <span className="rounded-full bg-[#39D97A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F]">
                        Featured
                      </span>
                    )}

                    {!item.is_active && (
                      <span className="rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-7 text-white/58">
                  {item.description}
                </p>

                {item.best_for && (
                  <div className="mt-5 rounded-[1.3rem] border border-[#1E314A] bg-[#07111F] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                      Best For
                    </p>

                    <p className="mt-2 text-sm font-bold text-white/68">
                      {item.best_for}
                    </p>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {(item.features || []).map((feature) => (
                    <div
                      key={feature}
                      className="rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3 text-sm text-white/65"
                    >
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={`/admin/pricing/${item.id}`}
                    className="rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-5 py-2.5 text-sm font-black text-[#39D97A]"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() =>
                      toggleFeatured(item.id, !!item.is_featured)
                    }
                    className="rounded-full border border-[#1E314A] bg-[#07111F] px-5 py-2.5 text-sm font-black text-white/70"
                  >
                    {item.is_featured
                      ? 'Remove Featured'
                      : 'Set Featured'}
                  </button>

                  <button
                    onClick={() =>
                      toggleActive(item.id, !!item.is_active)
                    }
                    className="rounded-full border border-[#1E314A] bg-[#07111F] px-5 py-2.5 text-sm font-black text-white/70"
                  >
                    {item.is_active ? 'Hide' : 'Activate'}
                  </button>

                  <button
                    onClick={() => deletePackage(item.id)}
                    className="rounded-full border border-red-400/25 bg-red-400/10 px-5 py-2.5 text-sm font-black text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}