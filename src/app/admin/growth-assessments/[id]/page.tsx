// src/app/admin/growth-assessments/[id]/page.tsx
// Server Component - No 'use client' needed

import { notFound } from 'next/navigation'
import { getAssessment } from '@/lib/services/assessment-service'
import { AdminAssessmentDetail } from '@/components/admin/AdminAssessmentDetail'
import { statusOptions } from '@/lib/services/assessment-service'

interface PageProps {
  params: {
    id: string
  }
}

export const metadata = {
  title: 'Assessment Detail | Admin',
  description: 'View assessment details',
}

export default async function AdminAssessmentDetailPage({ params }: PageProps) {
  const assessment = await getAssessment(params.id)

  if (!assessment) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <AdminAssessmentDetail 
        assessment={assessment} 
        statusOptions={statusOptions}
      />
    </div>
  )
}