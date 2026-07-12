// src/types/merchant-lifecycle.ts

export type MerchantStatus = 
  | 'lead'
  | 'assessment_submitted'
  | 'review_in_progress'
  | 'growth_profile_ready'
  | 'proposal_ready'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'onboarding_started'
  | 'active_client'
  | 'project_active'
  | 'project_completed'
  | 'retained'

export type GrowthReviewStatus = 'pending' | 'in_progress' | 'completed'

export type NotificationType = 
  | 'assessment_submitted'
  | 'review_started'
  | 'growth_profile_ready'
  | 'proposal_ready'
  | 'proposal_accepted'
  | 'onboarding_started'
  | 'project_started'
  | 'milestone_update'
  | 'invoice_generated'
  | 'project_completed'
  | 'quarterly_review_reminder'

export interface MerchantStatusRecord {
  id: string
  merchant_id: string
  status: MerchantStatus
  current_stage?: string
  last_activity: string
  created_at: string
  updated_at: string
}

export interface GrowthReview {
  id: string
  merchant_id: string
  assessment_id?: string
  reviewer_id?: string
  review_notes?: string
  hgri_score?: number
  growth_classification?: string
  strengths?: string[]
  opportunities?: string[]
  recommendations?: any
  visibility_score?: number
  conversion_score?: number
  retention_score?: number
  authority_score?: number
  scalability_score?: number
  status: GrowthReviewStatus
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  user_type: 'admin' | 'merchant' | 'client'
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
  updated_at: string
}

export interface MerchantLifecycleMetrics {
  totalMerchants: number
  lead: number
  assessmentSubmitted: number
  reviewInProgress: number
  growthProfileReady: number
  proposalReady: number
  proposalSent: number
  proposalAccepted: number
  onboardingStarted: number
  activeClient: number
  projectActive: number
  projectCompleted: number
  retained: number
}