'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    portfolio: 0,
    services: 0,
    faqs: 0,
    blog: 0,
    inquiries: 0,
    unreadInquiries: 0,
    subscribers: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      const [
        portfolio,
        services,
        faqs,
        blog,
        inquiries,
        unreadInquiries,
        subscribers,
      ] = await Promise.all([
        supabase.from('portfolio_items').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('faqs').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        portfolio: portfolio.count || 0,
        services: services.count || 0,
        faqs: faqs.count || 0,
        blog: blog.count || 0,
        inquiries: inquiries.count || 0,
        unreadInquiries: unreadInquiries.count || 0,
        subscribers: subscribers.count || 0,
      })
    }

    fetchStats()
  }, [])

  const cards = [
    {
      label: 'New Inquiries',
      value: stats.unreadInquiries,
      href: '/admin/inquiries',
      icon: 'email',
      highlight: true,
      color: 'accent',
    },
    {
      label: 'Total Inquiries',
      value: stats.inquiries,
      href: '/admin/inquiries',
      icon: 'messages',
      color: 'blue',
    },
    {
      label: 'Subscribers',
      value: stats.subscribers,
      href: '/admin/newsletter',
      icon: 'newsletter',
      color: 'purple',
    },
    {
      label: 'Portfolio',
      value: stats.portfolio,
      href: '/admin/portfolio',
      icon: 'portfolio',
      color: 'green',
    },
    {
      label: 'Services',
      value: stats.services,
      href: '/admin/services',
      icon: 'services',
      color: 'orange',
    },
    {
      label: 'Blog Posts',
      value: stats.blog,
      href: '/admin/blog',
      icon: 'blog',
      color: 'teal',
    },
    {
      label: 'FAQs',
      value: stats.faqs,
      href: '/admin/faqs',
      icon: 'faq',
      color: 'yellow',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-section)] p-6 shadow-[var(--shadow-md)]">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--accent)]">
          Admin Overview
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
          Manage Hbee Digitals Content
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          Track new inquiries, update website sections, manage portfolio case studies,
          publish blog insights, and keep the brand experience professional.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
              card.highlight
                ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--bg-card)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10">
                <SvgIcon name={card.icon} size={18} color="var(--accent)" />
              </div>
              <span className="text-xs font-bold text-[var(--accent)]">View →</span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {card.label}
            </p>
            <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
            Priority Action
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Review unread project inquiries first.
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            New inquiries are high-intent leads. Open the inbox, review the details,
            then mark them as contacted or qualified.
          </p>
          <Link
            href="/admin/inquiries"
            className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
          >
            Open Inquiry Inbox
          </Link>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
            Content System
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Keep case studies and services updated.
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Real case studies, service depth, and blog insights help position Hbee Digitals
            as a premium growth studio.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/portfolio" className="rounded-full border border-[var(--accent)]/30 px-4 py-2 text-sm font-black text-[var(--accent)] hover:bg-[var(--accent)]/10">
              Portfolio
            </Link>
            <Link href="/admin/services" className="rounded-full border border-[var(--accent)]/30 px-4 py-2 text-sm font-black text-[var(--accent)] hover:bg-[var(--accent)]/10">
              Services
            </Link>
            <Link href="/admin/blog" className="rounded-full border border-[var(--accent)]/30 px-4 py-2 text-sm font-black text-[var(--accent)] hover:bg-[var(--accent)]/10">
              Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}