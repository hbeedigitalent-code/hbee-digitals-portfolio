'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVisitors: 0,
    pageViews: 0,
    avgTime: '0:00',
    bounceRate: '0%',
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchAnalytics()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchAnalytics = async () => {
    // Simulate data - replace with actual GA API integration
    setStats({
      totalVisitors: 1247,
      pageViews: 3892,
      avgTime: '2:34',
      bounceRate: '45.2%',
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent-orange)]/5 to-transparent p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent-orange)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-[var(--accent)]/20 blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-orange-green shadow-lg">
              <SvgIcon name="chart" size={20} color="white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Analytics Overview</h2>
              <p className="text-sm text-[var(--text-secondary)]">Track your website performance and growth metrics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Total Visitors</p>
            <SvgIcon name="users" size={18} color="var(--accent)" />
          </div>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{stats.totalVisitors.toLocaleString()}</p>
          <p className="text-xs text-green-500">↑ 12% vs last period</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Page Views</p>
            <SvgIcon name="analytics" size={18} color="var(--accent)" />
          </div>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{stats.pageViews.toLocaleString()}</p>
          <p className="text-xs text-green-500">↑ 8% vs last period</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Avg. Time on Site</p>
            <SvgIcon name="clock" size={18} color="var(--accent)" />
          </div>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{stats.avgTime}</p>
          <p className="text-xs text-green-500">↑ 2% vs last period</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Bounce Rate</p>
            <SvgIcon name="trending-down" size={18} color="var(--accent)" />
          </div>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{stats.bounceRate}</p>
          <p className="text-xs text-green-500">↓ 5% vs last period</p>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-orange-green">
          <SvgIcon name="chart" size={28} color="white" />
        </div>
        <h3 className="text-xl font-black text-[var(--text-primary)]">Detailed Analytics Coming Soon</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Connect your Google Analytics account to see real-time traffic data, user behavior, and conversion metrics.
        </p>
        <button className="mt-4 rounded-full bg-gradient-orange-green px-6 py-2 text-sm font-black text-white transition hover:scale-[1.02]">
          Connect Google Analytics
        </button>
      </div>
    </div>
  )
}