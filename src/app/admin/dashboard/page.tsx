'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    portfolio: 0,
    services: 0,
    faqs: 0,
    blog: 0,
    inquiries: 0,
    unreadInquiries: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      const [portfolio, services, faqs, blog, inquiries, unreadInquiries] =
        await Promise.all([
          supabase.from('portfolio_items').select('*', { count: 'exact', head: true }),
          supabase.from('services').select('*', { count: 'exact', head: true }),
          supabase.from('faqs').select('*', { count: 'exact', head: true }),
          supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
          supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
          supabase
            .from('contact_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false),
        ])

      setStats({
        portfolio: portfolio.count || 0,
        services: services.count || 0,
        faqs: faqs.count || 0,
        blog: blog.count || 0,
        inquiries: inquiries.count || 0,
        unreadInquiries: unreadInquiries.count || 0,
      })
    }

    fetchStats()
  }, [])

  const cards = [
    {
      label: 'New Inquiries',
      value: stats.unreadInquiries,
      href: '/admin/inquiries',
      icon: '/svgs/inquiries.svg',
      highlight: true,
    },
    {
      label: 'Total Inquiries',
      value: stats.inquiries,
      href: '/admin/inquiries',
      icon: '/svgs/messages.svg',
    },
    {
      label: 'Portfolio Items',
      value: stats.portfolio,
      href: '/admin/portfolio',
      icon: '/svgs/portfolio-icon.svg',
    },
    {
      label: 'Services',
      value: stats.services,
      href: '/admin/services',
      icon: '/svgs/services.svg',
    },
    {
      label: 'Blog Posts',
      value: stats.blog,
      href: '/admin/blog',
      icon: '/svgs/blog.svg',
    },
    {
      label: 'FAQs',
      value: stats.faqs,
      href: '/admin/faqs',
      icon: '/svgs/faq.svg',
    },
  ]

  return (
    <div>
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#081321] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.25)] lg:p-8">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
          Admin Overview
        </p>

        <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
          Manage Hbee Digitals content, leads, and growth systems.
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55">
          Track new inquiries, update website sections, manage portfolio case studies,
          publish blog insights, and keep the brand experience professional.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-[1.7rem] border p-5 transition hover:-translate-y-1 hover:border-[#39D97A]/30 ${
              card.highlight
                ? 'border-[#39D97A]/25 bg-[#39D97A]/10'
                : 'border-[#1E314A] bg-[#0E1B2D]'
            }`}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#07111F] p-3">
                <img
                  src={card.icon}
                  alt=""
                  className="h-6 w-6 object-contain"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(626%) hue-rotate(73deg) brightness(94%) contrast(89%)',
                  }}
                />
              </span>

              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#39D97A]">
                View
              </span>
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
              {card.label}
            </p>

            <p className="mt-3 text-5xl font-black tracking-[-0.06em] text-white">
              {card.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Priority Action
          </p>

          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Review unread project inquiries first.
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/55">
            New inquiries are high-intent leads. Open the inbox, review the details,
            then mark them as contacted or qualified.
          </p>

          <Link
            href="/admin/inquiries"
            className="mt-6 inline-flex rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F]"
          >
            Open Inquiry Inbox
          </Link>
        </div>

        <div className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Content System
          </p>

          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Keep case studies and services updated.
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/55">
            Real case studies, service depth, and blog insights help position Hbee Digitals
            as a premium growth studio.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/portfolio" className="rounded-full border border-[#39D97A]/25 px-5 py-3 text-sm font-black text-[#39D97A]">
              Portfolio
            </Link>
            <Link href="/admin/services" className="rounded-full border border-[#39D97A]/25 px-5 py-3 text-sm font-black text-[#39D97A]">
              Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}