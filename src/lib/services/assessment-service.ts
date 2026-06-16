// src/lib/services/assessment-service.ts
// No 'use client' needed - server-side service

import { GrowthAssessment, Merchant } from '@/types/growth-readiness'

// Lazy initialize Supabase client
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set')
    return null
  }
  
  // Dynamic import to avoid build-time issues
  const { createClient } = require('@supabase/supabase-js')
  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return supabaseAdmin
}

export interface AssessmentWithMerchant extends GrowthAssessment {
  merchant: Merchant
}

export interface AdminFilters {
  status?: string
  classification?: string
  industry?: string
  country?: string
  minScore?: number
  maxScore?: number
  primaryConstraint?: string
  search?: string
  page?: number
  limit?: number
}

export async function getAssessments(filters?: AdminFilters): Promise<{
  data: AssessmentWithMerchant[]
  total: number
  page: number
  limit: number
}> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    console.warn('Supabase not configured - returning empty data')
    return {
      data: [],
      total: 0,
      page: filters?.page || 1,
      limit: filters?.limit || 20
    }
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('growth_assessments')
    .select(`
      *,
      merchant:merchants(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.classification) {
    query = query.eq('classification', filters.classification)
  }
  if (filters?.industry) {
    query = query.eq('merchant.industry', filters.industry)
  }
  if (filters?.country) {
    query = query.eq('merchant.country', filters.country)
  }
  if (filters?.minScore) {
    query = query.gte('hgri_score', filters.minScore)
  }
  if (filters?.maxScore) {
    query = query.lte('hgri_score', filters.maxScore)
  }
  if (filters?.primaryConstraint) {
    query = query.eq('primary_constraint', filters.primaryConstraint)
  }
  if (filters?.search) {
    query = query.or(
      `merchant.business_name.ilike.%${filters.search}%,` +
      `merchant.email.ilike.%${filters.search}%,` +
      `merchant.contact_name.ilike.%${filters.search}%`
    )
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching assessments:', error)
    throw new Error('Failed to fetch assessments')
  }

  return {
    data: data as AssessmentWithMerchant[],
    total: count || 0,
    page,
    limit
  }
}

export async function getAssessment(id: string): Promise<AssessmentWithMerchant | null> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    console.warn('Supabase not configured - returning null')
    return null
  }

  const { data, error } = await supabase
    .from('growth_assessments')
    .select(`
      *,
      merchant:merchants(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching assessment:', error)
    return null
  }

  return data as AssessmentWithMerchant
}

export async function updateAssessmentStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { error } = await supabase
    .from('growth_assessments')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('Error updating assessment status:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function archiveAssessment(id: string): Promise<{ success: boolean; error?: string }> {
  return updateAssessmentStatus(id, 'Archived')
}

export async function getDashboardStats(): Promise<{
  total: number
  newSubmissions: number
  underReview: number
  growthReady: number
  scaleReady: number
  avgScore: number
}> {
  const supabase = getSupabaseAdmin()
  
  if (!supabase) {
    console.warn('Supabase not configured - returning empty stats')
    return {
      total: 0,
      newSubmissions: 0,
      underReview: 0,
      growthReady: 0,
      scaleReady: 0,
      avgScore: 0
    }
  }

  const { data, error } = await supabase
    .from('growth_assessments')
    .select('status, classification, hgri_score')

  if (error) {
    console.error('Error fetching stats:', error)
    return {
      total: 0,
      newSubmissions: 0,
      underReview: 0,
      growthReady: 0,
      scaleReady: 0,
      avgScore: 0
    }
  }

  // Type the data properly
  type AssessmentRow = {
    status: string
    classification: string
    hgri_score: number
  }
  
  const typedData = data as AssessmentRow[]
  const total = typedData.length
  const newSubmissions = typedData.filter((d: AssessmentRow) => d.status === 'New Submission').length
  const underReview = typedData.filter((d: AssessmentRow) => d.status === 'Under Review').length
  const growthReady = typedData.filter((d: AssessmentRow) => d.classification === 'Growth Ready').length
  const scaleReady = typedData.filter((d: AssessmentRow) => d.classification === 'Scale Ready').length
  const avgScore = total > 0 
    ? typedData.reduce((sum: number, d: AssessmentRow) => sum + d.hgri_score, 0) / total 
    : 0

  return {
    total,
    newSubmissions,
    underReview,
    growthReady,
    scaleReady,
    avgScore: Math.round(avgScore)
  }
}

export const statusOptions = [
  'New Submission',
  'Under Review',
  'Growth Profile Issued',
  'Opportunity Review Candidate',
  'Opportunity Review Sent',
  'Growth Support Eligible',
  'Growth Partner',
  'Client',
  'Archived'
]

export const classificationOptions = [
  'Foundation Stage',
  'Growth Potential',
  'Growth Ready',
  'Scale Ready'
]

export const constraintOptions = [
  'Visibility',
  'Conversion',
  'Retention',
  'Authority',
  'Scalability',
  'Unknown'
]