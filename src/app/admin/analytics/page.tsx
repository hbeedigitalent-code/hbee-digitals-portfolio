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
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchAnalytics()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics')
      const result = await response.json()
      if (result.success) {
        setData(result)
      } else {
        console.error('Analytics fetch failed:', result.error)
        // Set empty data to show message
        setData({
          chartData: [],
          stats: {
            projects: { total: 0, published: 0, draft: 0 },
            messages: { total: 0, unread: 0, read: 0 },
            subscribers: { total: 0, active: 0, unsubscribed: 0 },
            blog: { total: 0, published: 0, draft: 0, totalViews: 0 }
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0A1D37', '#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6']

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!data || data.chartData.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
        <p className="text-gray-500">
          Start adding content to see your analytics dashboard.
        </p>
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
        <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Track your website performance and growth</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#0A1D37' }}>
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-2xl font-bold">{stats.projects.total}</p>
          <p className="text-xs text-green-600 mt-1">{stats.projects.published} published</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold">{stats.messages.total}</p>
          <p className="text-xs text-orange-600 mt-1">{stats.messages.unread} unread</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-sm text-gray-500">Subscribers</p>
          <p className="text-2xl font-bold">{stats.subscribers.total}</p>
          <p className="text-xs text-green-600 mt-1">{stats.subscribers.active} active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-sm text-gray-500">Blog Views</p>
          <p className="text-2xl font-bold">{stats.blog.totalViews}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.blog.published} published posts</p>
        </div>
      </div>

      {/* Chart Type Selector */}
      {chartData.length > 0 && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded text-sm transition ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 rounded text-sm transition ${chartType === 'area' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Area Chart
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded text-sm transition ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Bar Chart
            </button>
          </div>

          {/* Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
              Growth Over Time (Last 30 Days)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' && (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="messages" stroke="#3B82F6" name="Messages" strokeWidth={2} />
                    <Line type="monotone" dataKey="subscribers" stroke="#10B981" name="Subscribers" strokeWidth={2} />
                  </LineChart>
                )}
                {chartType === 'area' && (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="messages" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="subscribers" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                )}
                {chartType === 'bar' && (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="messages" fill="#3B82F6" name="Messages" />
                    <Bar dataKey="subscribers" fill="#10B981" name="Subscribers" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Pie Charts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {projectPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-semibold text-center mb-2">Projects Status</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {projectPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2 flex-wrap">
              {projectPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {messagePieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-semibold text-center mb-2">Messages Status</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={messagePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {messagePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2 flex-wrap">
              {messagePieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {subscriberPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-semibold text-center mb-2">Subscribers Status</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subscriberPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {subscriberPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2 flex-wrap">
              {subscriberPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {blogPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-semibold text-center mb-2">Blog Status</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={blogPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {blogPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2 flex-wrap">
              {blogPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--primary-color)' }}>
          📊 Key Insights
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600">📈</span>
            </div>
            <div>
              <p className="font-medium">Total Engagement</p>
              <p className="text-sm text-gray-600">
                {stats.messages.total + stats.subscribers.total + stats.blog.totalViews} total interactions
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600">📝</span>
            </div>
            <div>
              <p className="font-medium">Content Overview</p>
              <p className="text-sm text-gray-600">
                {stats.projects.published + stats.blog.published} published items
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600">👥</span>
            </div>
            <div>
              <p className="font-medium">Audience Growth</p>
              <p className="text-sm text-gray-600">
                {stats.subscribers.active} active subscribers
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-600">✉️</span>
            </div>
            <div>
              <p className="font-medium">Response Needed</p>
              <p className="text-sm text-gray-600">
                {stats.messages.unread} unread messages
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}