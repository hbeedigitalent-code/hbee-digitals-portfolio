// src/app/admin/growth-assessments/page.tsx
// Server Component - No 'use client' needed

import { getAssessments, getDashboardStats, statusOptions, classificationOptions, constraintOptions } from '@/lib/services/assessment-service'
import { AdminAssessmentList } from '@/components/admin/AdminAssessmentList'
import { AdminStats } from '@/components/admin/AdminStats'

interface PageProps {
  searchParams: {
    status?: string
    classification?: string
    industry?: string
    country?: string
    minScore?: string
    maxScore?: string
    primaryConstraint?: string
    search?: string
    page?: string
  }
}

export const metadata = {
  title: 'Growth Assessments | Admin',
  description: 'Manage and review growth assessment submissions',
}

export default async function AdminGrowthAssessmentsPage({ searchParams }: PageProps) {
  // Build filters from search params
  const page = searchParams.page ? parseInt(searchParams.page) : 1
  const filters = {
    status: searchParams.status,
    classification: searchParams.classification,
    industry: searchParams.industry,
    country: searchParams.country,
    minScore: searchParams.minScore ? parseInt(searchParams.minScore) : undefined,
    maxScore: searchParams.maxScore ? parseInt(searchParams.maxScore) : undefined,
    primaryConstraint: searchParams.primaryConstraint,
    search: searchParams.search,
    page,
    limit: 20
  }

  const [assessmentsResult, stats] = await Promise.all([
    getAssessments(filters),
    getDashboardStats()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Growth Assessments</h1>
        <p className="text-[var(--text-muted)]">Manage and review all assessment submissions</p>
      </div>

      {/* Stats */}
      <AdminStats stats={stats} />

      {/* Filters and List */}
      <AdminAssessmentList 
        assessments={assessmentsResult.data}
        total={assessmentsResult.total}
        currentPage={assessmentsResult.page}
        totalPages={Math.ceil(assessmentsResult.total / assessmentsResult.limit)}
        filters={filters}
        statusOptions={statusOptions}
        classificationOptions={classificationOptions}
        constraintOptions={constraintOptions}
      />
    </div>
  )
}