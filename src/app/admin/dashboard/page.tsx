'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

type Stats = {
  portfolio: number
  services: number
  faqs: number
  blog: number
  comments: number
  inquiries: number
  unreadInquiries: number
  subscribers: number
  team: number
  testimonials: number
}

function SvgMaskIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: string
  className?: string
}) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: `url(/svgs/${name}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${name}.svg) center / contain no-repeat`,
      }}
    />
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    portfolio: 0,
    services: 0,
    faqs: 0,
    blog: 0,
    comments: 0,
    inquiries: 0,
    unreadInquiries: 0,
    subscribers: 0,
    team: 0,
    testimonials: 0,
  })

  const [recentInquiries, setRecentInquiries] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
    fetchRecentInquiries()
    fetchRecentActivity()

    const interval = setInterval(() => {
      fetchStats()
      fetchRecentInquiries()
      fetchRecentActivity()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  async function safeCount(table: string, filter?: { column: string; value: any }) {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })

    if (filter) {
      query = query.eq(filter.column, filter.value)
    }

    const { count } = await query
    return count || 0
  }

  async function fetchStats() {
    const [
      portfolio,
      services,
      faqs,
      blog,
      comments,
      inquiries,
      unreadInquiries,
      subscribers,
      team,
      testimonials,
    ] = await Promise.all([
      safeCount('portfolio_items'),
      safeCount('services'),
      safeCount('faqs'),
      safeCount('blog_posts'),
      safeCount('blog_comments'),
      safeCount('contact_submissions'),
      safeCount('contact_submissions', { column: 'is_read', value: false }),
      safeCount('newsletter_subscribers'),
      safeCount('team_members'),
      safeCount('testimonials'),
    ])

    setStats({
      portfolio,
      services,
      faqs,
      blog,
      comments,
      inquiries,
      unreadInquiries,
      subscribers,
      team,
      testimonials,
    })
  }

  async function fetchRecentInquiries() {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentInquiries(data || [])
  }

  async function fetchRecentActivity() {
    const [recentPortfolio, recentBlog, recentComments] = await Promise.all([
      supabase
        .from('portfolio_items')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('blog_posts')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('blog_comments')
        .select('author_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const activities = [
      ...(recentPortfolio.data?.map((p) => ({
        type: 'portfolio',
        name: p.name,
        time: p.created_at,
      })) || []),

      ...(recentBlog.data?.map((b) => ({
        type: 'blog',
        name: b.title,
        time: b.created_at,
      })) || []),

      ...(recentComments.data?.map((c) => ({
        type: 'comment',
        name: `New comment by ${c.author_name || 'Anonymous'}`,
        time: c.created_at,
      })) || []),
    ]

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setRecentActivity(activities.slice(0, 5))
  }

  const statCards = [
    { label: 'Total Inquiries', value: stats.inquiries, href: '/admin/inquiries', icon: 'email', color: 'orange' },
    { label: 'Unread', value: stats.unreadInquiries, href: '/admin/inquiries', icon: 'messages', color: 'red', highlight: true },
    { label: 'Active Subscribers', value: stats.subscribers, href: '/admin/subscribers', icon: 'users', color: 'green' },
    { label: 'Portfolio', value: stats.portfolio, href: '/admin/portfolio', icon: 'portfolio', color: 'blue' },
    { label: 'Services', value: stats.services, href: '/admin/services', icon: 'services', color: 'purple' },
    { label: 'Blog Posts', value: stats.blog, href: '/admin/blog', icon: 'blog', color: 'teal' },
    { label: 'Comments', value: stats.comments, href: '/admin/comments', icon: 'comment', color: 'green' },
    { label: 'Team Members', value: stats.team, href: '/admin/team', icon: 'team', color: 'pink' },
    { label: 'Testimonials', value: stats.testimonials, href: '/admin/testimonials', icon: 'star', color: 'yellow' },
    { label: 'FAQs', value: stats.faqs, href: '/admin/faqs', icon: 'faq', color: 'blue' },
  ]

  function getColorClasses(color: string, highlight?: boolean) {
    if (highlight) return 'bg-[var(--accent)]'

    const colors: Record<string, string> = {
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      teal: 'bg-teal-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500',
    }

    return colors[color] || 'bg-[var(--accent)]'
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent-orange)]/5 to-transparent p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent-orange)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-[var(--accent)]/20 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-orange-green shadow-lg">
              <SvgIcon name="analytics" size={20} color="white" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                Welcome back!
              </h1>

              <p className="text-sm text-[var(--text-secondary)]">
                Here&apos;s what&apos;s happening with your website today.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                System Online
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--accent)]">
              <SvgMaskIcon name="clock" className="h-3 w-3" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                Last updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link
              href={card.href}
              className="group relative block overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-page)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <div className={`absolute inset-y-0 left-0 w-1 ${getColorClasses(card.color, card.highlight)}`} />

              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)] transition group-hover:scale-110">
                  <SvgMaskIcon name={card.icon} className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 text-3xl font-black text-[var(--text-primary)]">
                {card.value}
              </p>

              <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                {card.label}
              </p>

              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                <span>View details</span>
                <SvgMaskIcon name="arrow-right" className="h-3 w-3" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-page)] p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-orange-green text-white">
              <SvgMaskIcon name="email" className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                Priority Action
              </p>

              <h3 className="text-lg font-black text-[var(--text-primary)]">
                Review unread inquiries
              </h3>
            </div>
          </div>

          <p className="mb-6 text-sm leading-7 text-[var(--text-secondary)]">
            You have{' '}
            <span className="font-bold text-[var(--accent)]">
              {stats.unreadInquiries}
            </span>{' '}
            unread message{stats.unreadInquiries !== 1 ? 's' : ''} that need your
            attention. Respond promptly to convert leads into clients.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:scale-[1.02]"
            >
              Open Inbox
              <SvgMaskIcon name="arrow-diagonal" className="h-4 w-4" />
            </Link>

            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-5 py-2.5 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
            >
              Site Settings
              <SvgMaskIcon name="settings" className="h-4 w-4 text-[var(--accent)]" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <SvgMaskIcon name="messages" className="h-4 w-4" />
              <h3 className="font-black text-[var(--text-primary)]">Recent Inquiries</h3>
            </div>

            {stats.unreadInquiries > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-[#07111F]">
                {stats.unreadInquiries} new
              </span>
            )}
          </div>

          {recentInquiries.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
              No inquiries yet
            </p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {recentInquiries.slice(0, 3).map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href="/admin/inquiries"
                  className="block rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[var(--text-primary)]">
                      {inquiry.full_name || 'Anonymous'}
                    </p>

                    {!inquiry.is_read && (
                      <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        New
                      </span>
                    )}
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {inquiry.message}
                  </p>

                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/admin/inquiries"
            className="mt-4 block text-center text-sm font-bold text-[var(--accent)] hover:underline"
          >
            View all inquiries →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center gap-2 text-[var(--accent)]">
            <SvgMaskIcon name="clock" className="h-4 w-4" />
            <h3 className="font-black text-[var(--text-primary)]">Recent Activity</h3>
          </div>

          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
              No recent activity
            </p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
                    <SvgMaskIcon
                      name={
                        activity.type === 'portfolio'
                          ? 'portfolio'
                          : activity.type === 'comment'
                            ? 'comment'
                            : 'blog'
                      }
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {activity.type === 'portfolio'
                        ? 'Portfolio added:'
                        : activity.type === 'comment'
                          ? 'Comment submitted:'
                          : 'Blog post added:'}
                    </p>

                    <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                      {activity.name}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs text-[var(--text-muted)]">
                    {new Date(activity.time).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center gap-2 text-[var(--accent)]">
            <SvgMaskIcon name="link" className="h-4 w-4" />
            <h3 className="font-black text-[var(--text-primary)]">Quick Links</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Add Portfolio Item', href: '/admin/portfolio/new', icon: 'plus' },
              { label: 'Write Blog Post', href: '/admin/blog/new', icon: 'plus' },
              { label: 'Review Comments', href: '/admin/comments', icon: 'comment' },
              { label: 'Manage Subscribers', href: '/admin/subscribers', icon: 'users' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-orange-green text-white">
                  <SvgMaskIcon name={item.icon} className="h-4 w-4" />
                </div>

                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              Content Summary
            </h3>

            <p className="text-sm text-[var(--text-secondary)]">
              Overview of your website content.
            </p>
          </div>

          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
          >
            <SvgMaskIcon name="settings" className="h-4 w-4 text-[var(--accent)]" />
            Manage Content
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Portfolio', value: stats.portfolio, icon: 'portfolio' },
            { label: 'Services', value: stats.services, icon: 'services' },
            { label: 'Blog Posts', value: stats.blog, icon: 'blog' },
            { label: 'Comments', value: stats.comments, icon: 'comment' },
            { label: 'FAQs', value: stats.faqs, icon: 'faq' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <div>
                <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">
                  {item.value}
                </p>
              </div>

              <span className="text-[var(--accent)]">
                <SvgMaskIcon name={item.icon} className="h-6 w-6" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}