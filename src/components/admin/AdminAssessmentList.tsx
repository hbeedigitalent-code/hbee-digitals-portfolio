'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AssessmentWithMerchant } from '@/lib/services/assessment-service'
import SvgIcon from '@/components/ui/SvgIcon'
import { getClassificationColor, getStatusColor } from '@/lib/scoring/hgri-scoring'

interface AdminAssessmentListProps {
  assessments: AssessmentWithMerchant[]
  total: number
  currentPage: number
  totalPages: number
  filters: {
    status?: string
    classification?: string
    industry?: string
    country?: string
    minScore?: number
    maxScore?: number
    primaryConstraint?: string
    search?: string
    page?: number
  }
  statusOptions: string[]
  classificationOptions: string[]
  constraintOptions: string[]
}

export function AdminAssessmentList({ 
  assessments, 
  total,
  currentPage,
  totalPages,
  filters, 
  statusOptions, 
  classificationOptions, 
  constraintOptions 
}: AdminAssessmentListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'search' && key !== 'page') {
        params.set(key, String(value))
      }
    })
    router.push(`/admin/growth-assessments?${params.toString()}`)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (value) params.set(key, value)
    Object.entries(filters).forEach(([k, v]) => {
      if (v && k !== key && k !== 'search' && k !== 'page') {
        params.set(k, String(v))
      }
    })
    router.push(`/admin/growth-assessments?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/admin/growth-assessments')
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    params.set('page', page.toString())
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'search' && key !== 'page') {
        params.set(key, String(value))
      }
    })
    router.push(`/admin/growth-assessments?${params.toString()}`)
  }

  const hasFilters = Object.values(filters).some(v => v && v !== '')

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business, contact, or email..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 pr-10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
              <SvgIcon name="search" size={18} color="var(--text-muted)" />
            </button>
          </div>
        </form>

        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
        >
          <SvgIcon name="settings" size={16} />
          Filters
          {hasFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-[var(--text-muted)]">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-muted)]">Classification</label>
              <select
                value={filters.classification || ''}
                onChange={(e) => handleFilterChange('classification', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">All Classifications</option>
                {classificationOptions.map((classification) => (
                  <option key={classification} value={classification}>{classification}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-muted)]">Primary Constraint</label>
              <select
                value={filters.primaryConstraint || ''}
                onChange={(e) => handleFilterChange('primaryConstraint', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">All Constraints</option>
                {constraintOptions.map((constraint) => (
                  <option key={constraint} value={constraint}>{constraint}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-muted)]">Min HGRI Score</label>
              <input
                type="number"
                value={filters.minScore || ''}
                onChange={(e) => handleFilterChange('minScore', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Assessment List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SvgIcon name="growth-readiness" size={48} color="var(--text-muted)" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No assessments found</h3>
            <p className="text-[var(--text-muted)]">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3 hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Industry</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Classification</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Constraint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-[var(--bg-section)] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{assessment.merchant.business_name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{assessment.merchant.website}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-[var(--text-secondary)]">
                        {assessment.merchant.contact_name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {assessment.merchant.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-[var(--text-secondary)]">
                      {assessment.merchant.industry}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-[var(--text-primary)]">
                        {assessment.hgri_score}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">/100</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-white ${getClassificationColor(assessment.classification)}`}>
                        {assessment.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {assessment.primary_constraint}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(assessment.status)}`}>
                        {assessment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/growth-assessments/${assessment.id}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
                      >
                        View
                        <SvgIcon name="chevron-right" size={14} color="var(--accent)" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-[var(--text-muted)]">
            Showing {assessments.length} of {total} assessments
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-section)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-[var(--text-primary)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-section)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}