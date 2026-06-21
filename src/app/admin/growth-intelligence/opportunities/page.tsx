'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { GrowthOpportunity, OpportunityCategory, OpportunityStatus } from '@/types/growth-intelligence'

const categories: OpportunityCategory[] = [
  'SEO', 'Content', 'Authority', 'Conversion', 'Retention',
  'AI Visibility', 'Product Presentation', 'Trust', 'Email Marketing',
  'Automation', 'Upsells', 'Cross-Sells', 'Brand Positioning'
]

const statusColors: Record<OpportunityStatus, string> = {
  'Identified': 'bg-blue-500/20 text-blue-400',
  'In Progress': 'bg-yellow-500/20 text-yellow-400',
  'Completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Deferred': 'bg-gray-500/20 text-gray-400',
}

export default function AdminOpportunitiesPage() {
  const supabase = createClientComponentClient()
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    fetchOpportunities()
  }, [])

  async function fetchOpportunities() {
    setLoading(true)

    const { data, error } = await supabase
      .from('growth_opportunities')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOpportunities(data)
    }

    setLoading(false)
  }

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = 
      opp.title?.toLowerCase().includes(search.toLowerCase()) ||
      opp.category?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || opp.category === categoryFilter
    const matchesPriority = priorityFilter === 'all' || opp.priority_level === priorityFilter
    return matchesSearch && matchesCategory && matchesPriority
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Growth Opportunities</h1>
        <Link
          href="/admin/growth-intelligence/opportunities/new"
          className="rounded-full bg-[var(--accent-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          + New Opportunity
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOpportunities.length === 0 ? (
          <div className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
            <SvgIcon name="growth" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No opportunities found</p>
          </div>
        ) : (
          filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 transition hover:border-[var(--accent-orange)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    opp.priority_level === 'High' ? 'bg-red-500/20 text-red-400' :
                    opp.priority_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {opp.priority_level}
                  </span>
                  <span className="ml-2 rounded-full bg-[var(--bg-navy-mid)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                    {opp.category}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[opp.status as OpportunityStatus]}`}>
                  {opp.status}
                </span>
              </div>

              <h3 className="mt-3 font-semibold text-white">{opp.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">{opp.description}</p>

              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>Impact: {opp.impact_score}/10</span>
                <span>Difficulty: {opp.difficulty_score}/10</span>
                {opp.estimated_timeline && <span>⏱ {opp.estimated_timeline}</span>}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(opp.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/admin/growth-intelligence/opportunities/${opp.id}`}
                  className="text-sm text-[var(--accent-orange)] hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}