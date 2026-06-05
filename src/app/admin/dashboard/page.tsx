'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    portfolio: 0,
    services: 0,
    faqs: 0,
    blog: 0,
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

  async function fetchStats() {
    const [
      portfolio, services, faqs, blog, inquiries, unreadInquiries, subscribers, team, testimonials
    ] = await Promise.all([
      supabase.from('portfolio_items').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('faqs').select('*', { count: 'exact', head: true }),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('team_members').select('*', { count: 'exact', head: true }),
      supabase.from('testimonials').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      portfolio: portfolio.count || 0,
      services: services.count || 0,
      faqs: faqs.count || 0,
      blog: blog.count || 0,
      inquiries: inquiries.count || 0,
      unreadInquiries: unreadInquiries.count || 0,
      subscribers: subscribers.count || 0,
      team: team.count || 0,
      testimonials: testimonials.count || 0,
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
    const [recentPortfolio, recentBlog] = await Promise.all([
      supabase.from('portfolio_items').select('name, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('blog_posts').select('title, created_at').order('created_at', { ascending: false }).limit(3),
    ])
    
    const activities = [
      ...(recentPortfolio.data?.map(p => ({ type: 'portfolio', name: p.name, time: p.created_at })) || []),
      ...(recentBlog.data?.map(b => ({ type: 'blog', name: b.title, time: b.created_at })) || []),
    ]
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setRecentActivity(activities.slice(0, 5))
  }

  const statCards = [
    { label: 'Total Inquiries', value: stats.inquiries, href: '/admin/inquiries', icon: 'email', color: 'orange', change: '+12%' },
    { label: 'Unread', value: stats.unreadInquiries, href: '/admin/inquiries', icon: 'messages', color: 'red', highlight: true },
    { label: 'Subscribers', value: stats.subscribers, href: '/admin/newsletter', icon: 'users', color: 'green', change: '+5%' },
    { label: 'Portfolio', value: stats.portfolio, href: '/admin/portfolio', icon: 'portfolio', color: 'blue' },
    { label: 'Services', value: stats.services, href: '/admin/services', icon: 'services', color: 'purple' },
    { label: 'Blog Posts', value: stats.blog, href: '/admin/blog', icon: 'blog', color: 'teal' },
    { label: 'Team Members', value: stats.team, href: '/admin/team', icon: 'team', color: 'pink' },
    { label: 'Testimonials', value: stats.testimonials, href: '/admin/testimonials', icon: 'star', color: 'yellow' },
  ]

  const getColorClasses = (color: string, highlight: boolean = false) => {
    if (highlight) return 'border-l-[var(--accent)] from-[var(--accent)]/5 to-transparent'
    const colors: Record<string, string> = {
      orange: 'border-l-orange-500 from-orange-500/5 to-transparent',
      red: 'border-l-red-500 from-red-500/5 to-transparent',
      green: 'border-l-green-500 from-green-500/5 to-transparent',
      blue: 'border-l-blue-500 from-blue-500/5 to-transparent',
      purple: 'border-l-purple-500 from-purple-500/5 to-transparent',
      teal: 'border-l-teal-500 from-teal-500/5 to-transparent',
      pink: 'border-l-pink-500 from-pink-500/5 to-transparent',
      yellow: 'border-l-yellow-500 from-yellow-500/5 to-transparent',
    }
    return colors[color] || 'border-l-[var(--accent)] from-[var(--accent)]/5 to-transparent'
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent-orange)]/5 to-transparent p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent-orange)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-[var(--accent)]/20 blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-orange-green shadow-lg">
              <SvgIcon name="analytics" size={20} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">Welcome back!</h1>
              <p className="text-sm text-[var(--text-secondary)]">Here's what's happening with your website today.</p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2">
              <div className="flex h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">System Online</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2">
              <SvgIcon name="clock" size={12} color="var(--accent)" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={card.href}
              className="group relative block overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-page)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${getColorClasses(card.color, card.highlight)}`} />
              
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 transition group-hover:scale-110">
                  <SvgIcon name={card.icon} size={18} color="var(--accent)" />
                </div>
                {card.change && <span className="text-xs font-bold text-green-500">{card.change}</span>}
              </div>
              
              <p className="mt-4 text-3xl font-black text-[var(--text-primary)]">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">{card.label}</p>
              
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                <span>View details</span>
                <SvgIcon name="arrow-right" size={12} color="var(--accent)" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions & Recent Inquiries */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-page)] p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-orange-green">
              <SvgIcon name="email" size={18} color="white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Priority Action</p>
              <h3 className="text-lg font-black text-[var(--text-primary)]">Review unread inquiries</h3>
            </div>
          </div>
          
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            You have <span className="font-bold text-[var(--accent)]">{stats.unreadInquiries}</span> unread message{stats.unreadInquiries !== 1 ? 's' : ''} 
            that need your attention. Respond promptly to convert leads into clients.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/inquiries" className="inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:scale-[1.02]">
              Open Inbox
              <SvgIcon name="arrow-diagonal" size={14} color="white" />
            </Link>
            <Link href="/admin/settings" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-5 py-2.5 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25">
              Site Settings
              <SvgIcon name="settings" size={14} color="var(--accent)" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SvgIcon name="messages" size={16} color="var(--accent)" />
              <h3 className="font-black text-[var(--text-primary)]">Recent Inquiries</h3>
            </div>
            {stats.unreadInquiries > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-[var(--btn-primary-text)]">
                {stats.unreadInquiries} new
              </span>
            )}
          </div>
          
          {recentInquiries.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">No inquiries yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentInquiries.slice(0, 3).map((inquiry) => (
                <Link key={inquiry.id} href="/admin/inquiries" className="block rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[var(--text-primary)]">{inquiry.full_name || 'Anonymous'}</p>
                    {!inquiry.is_read && <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">New</span>}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{inquiry.message}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{new Date(inquiry.created_at).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
          
          <Link href="/admin/inquiries" className="mt-4 block text-center text-sm font-bold text-[var(--accent)] hover:underline">
            View all inquiries →
          </Link>
        </div>
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <SvgIcon name="clock" size={16} color="var(--accent)" />
            <h3 className="font-black text-[var(--text-primary)]">Recent Activity</h3>
          </div>
          
          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10">
                    <SvgIcon name={activity.type === 'portfolio' ? 'portfolio' : 'blog'} size={14} color="var(--accent)" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {activity.type === 'portfolio' ? 'Portfolio added:' : 'Blog post added:'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{activity.name}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] flex-shrink-0">{new Date(activity.time).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <SvgIcon name="link" size={16} color="var(--accent)" />
            <h3 className="font-black text-[var(--text-primary)]">Quick Links</h3>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/admin/portfolio/new" className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-orange-green">
                <SvgIcon name="plus" size={14} color="white" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">Add Portfolio Item</span>
            </Link>
            <Link href="/admin/blog/new" className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-orange-green">
                <SvgIcon name="plus" size={14} color="white" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">Write Blog Post</span>
            </Link>
            <Link href="/admin/services/new" className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-orange-green">
                <SvgIcon name="plus" size={14} color="white" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">Add New Service</span>
            </Link>
            <Link href="/admin/team/new" className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]/25">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-orange-green">
                <SvgIcon name="plus" size={14} color="white" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">Add Team Member</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Summary Section */}
      <div className="rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[var(--text-primary)]">Content Summary</h3>
            <p className="text-sm text-[var(--text-secondary)]">Overview of your website content</p>
          </div>
          <Link href="/admin/settings" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)]/25">
            <SvgIcon name="settings" size={14} color="var(--accent)" />
            Manage Content
          </Link>
        </div>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Portfolio</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{stats.portfolio}</p>
            </div>
            <SvgIcon name="portfolio" size={24} color="var(--accent)" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Services</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{stats.services}</p>
            </div>
            <SvgIcon name="services" size={24} color="var(--accent)" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Blog Posts</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{stats.blog}</p>
            </div>
            <SvgIcon name="blog" size={24} color="var(--accent)" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">FAQs</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{stats.faqs}</p>
            </div>
            <SvgIcon name="faq" size={24} color="var(--accent)" />
          </div>
        </div>
      </div>
    </div>
  )
}