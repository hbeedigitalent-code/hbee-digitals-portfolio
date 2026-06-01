'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import SvgIcon from '@/components/ui/SvgIcon'

interface AnalyticsData {
  chartData: Array<{
    date: string
    messages: number
    subscribers: number
  }>
  stats: {
    projects: { total: number; published: number; draft: number }
    messages: { total: number; unread: number; read: number }
    subscribers: { total: number; active: number; unsubscribed: number }
    blog: { total: number; published: number; draft: number; totalViews: number }
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [gaData, setGaData] = useState<any>(null)
  const [gaLoading, setGaLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchAnalytics()
    fetchGoogleAnalyticsData()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics')
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGoogleAnalyticsData = async () => {
    setGaLoading(true)
    try {
      const response = await fetch('/api/google-analytics')
      const result = await response.json()
      if (result.success) {
        setGaData(result)
      }
    } catch (error) {
      console.error('Failed to fetch GA data:', error)
    } finally {
      setGaLoading(false)
    }
  }

  const COLORS = ['#39D97A', '#C6F135', '#FF6B35', '#0F3460', '#1B4F8A']

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
        <SvgIcon name="analytics" size={48} color="var(--text-muted)" />
        <h3 className="mt-4 text-lg font-black text-[var(--text-primary)]">No Analytics Data Yet</h3>
        <p className="mt-2 text-[var(--text-secondary)]">Start adding content to see your analytics dashboard.</p>
      </div>
    )
  }

  const { chartData, stats } = data

  const projectPieData = [
    { name: 'Published', value: stats.projects.published },
    { name: 'Draft', value: stats.projects.draft },
  ].filter(item => item.value > 0)

  const messagePieData = [
    { name: 'Read', value: stats.messages.read },
    { name: 'Unread', value: stats.messages.unread },
  ].filter(item => item.value > 0)

  const subscriberPieData = [
    { name: 'Active', value: stats.subscribers.active },
    { name: 'Unsubscribed', value: stats.subscribers.unsubscribed },
  ].filter(item => item.value > 0)

  const blogPieData = [
    { name: 'Published', value: stats.blog.published },
    { name: 'Draft', value: stats.blog.draft },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Analytics Dashboard</h2>
        <p className="text-sm text-[var(--text-secondary)]">Track your website performance and growth</p>
      </div>

      {/* GA4 Stats Cards */}
      {gaData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border-l-4 border-l-[var(--accent)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-muted)]">Page Views (30 days)</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{gaData.totalPageViews?.toLocaleString() || 0}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-blue-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-muted)]">Unique Visitors</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{gaData.totalUsers?.toLocaleString() || 0}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-orange-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-muted)]">Avg Engagement Time</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{gaData.avgEngagementTime || '0:00'}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-purple-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-muted)]">Bounce Rate</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{gaData.bounceRate || '0%'}</p>
          </div>
        </div>
      )}

      {/* Internal Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-l-4 border-l-[var(--accent)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Total Projects</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats.projects.total}</p>
          <p className="text-xs text-[var(--accent)] mt-1">{stats.projects.published} published</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-blue-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Total Messages</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats.messages.total}</p>
          <p className="text-xs text-orange-400 mt-1">{stats.messages.unread} unread</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-green-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Subscribers</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats.subscribers.total}</p>
          <p className="text-xs text-green-400 mt-1">{stats.subscribers.active} active</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-yellow-500 bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-sm text-[var(--text-muted)]">Blog Posts</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats.blog.total}</p>
          <p className="text-xs text-yellow-400 mt-1">{stats.blog.published} published</p>
        </div>
      </div>

      {/* Growth Chart */}
      {chartData.length > 0 && (
        <>
          <div className="flex justify-end gap-2">
            {(['line', 'area', 'bar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`rounded-lg px-3 py-1 text-sm font-bold transition ${
                  chartType === type ? 'bg-[var(--accent)] text-[var(--btn-primary-text)]' : 'bg-[var(--bg-section)] text-[var(--text-muted)]'
                }`}
              >
                {type === 'line' ? 'Line' : type === 'area' ? 'Area' : 'Bar'} Chart
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 text-lg font-black text-[var(--text-primary)]">Growth Over Time (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={320}>
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="messages" stroke="#3B82F6" name="Messages" strokeWidth={2} />
                  <Line type="monotone" dataKey="subscribers" stroke="#10B981" name="Subscribers" strokeWidth={2} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="messages" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Messages" />
                  <Area type="monotone" dataKey="subscribers" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Subscribers" />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Legend />
                  <Bar dataKey="messages" fill="#3B82F6" name="Messages" />
                  <Bar dataKey="subscribers" fill="#10B981" name="Subscribers" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Pie Charts */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {projectPieData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h4 className="mb-2 text-center font-black text-[var(--text-primary)]">Projects Status</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={projectPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                  {projectPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {projectPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span>{item.name}: {item.value}</span></div>
              ))}
            </div>
          </div>
        )}

        {messagePieData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h4 className="mb-2 text-center font-black text-[var(--text-primary)]">Messages Status</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={messagePieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{messagePieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {messagePieData.map((item, i) => (<div key={i} className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span>{item.name}: {item.value}</span></div>))}
            </div>
          </div>
        )}

        {subscriberPieData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h4 className="mb-2 text-center font-black text-[var(--text-primary)]">Subscribers Status</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={subscriberPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{subscriberPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {subscriberPieData.map((item, i) => (<div key={i} className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span>{item.name}: {item.value}</span></div>))}
            </div>
          </div>
        )}

        {blogPieData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h4 className="mb-2 text-center font-black text-[var(--text-primary)]">Blog Status</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={blogPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{blogPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {blogPieData.map((item, i) => (<div key={i} className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span>{item.name}: {item.value}</span></div>))}
            </div>
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div className="rounded-xl bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-lime)]/10 p-6">
        <h3 className="mb-3 text-lg font-black text-[var(--text-primary)]">📊 Key Insights</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20"><span className="text-green-400">📈</span></div><div><p className="font-bold">Total Engagement</p><p className="text-sm text-[var(--text-secondary)]">{stats.messages.total + stats.subscribers.total + stats.blog.total} total interactions</p></div></div>
          <div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20"><span className="text-blue-400">📝</span></div><div><p className="font-bold">Content Overview</p><p className="text-sm text-[var(--text-secondary)]">{stats.projects.published + stats.blog.published} published items</p></div></div>
          <div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20"><span className="text-purple-400">👥</span></div><div><p className="font-bold">Audience Growth</p><p className="text-sm text-[var(--text-secondary)]">{stats.subscribers.active} active subscribers</p></div></div>
          <div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20"><span className="text-yellow-400">✉️</span></div><div><p className="font-bold">Response Needed</p><p className="text-sm text-[var(--text-secondary)]">{stats.messages.unread} unread messages</p></div></div>
        </div>
      </div>
    </div>
  )
}