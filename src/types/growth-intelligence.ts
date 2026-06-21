export interface GrowthScore {
  id: string
  merchant_id: string
  visibility_score: number
  conversion_score: number
  retention_score: number
  authority_score: number
  scalability_score: number
  ai_visibility_score: number
  brand_strength_score: number
  content_strength_score: number
  overall_score: number
  classification: string
  created_at: string
  updated_at: string
}

export interface AuditReport {
  id: string
  merchant_id: string
  business_name: string
  website: string
  reviewer: string
  review_date: string
  audit_type: string
  findings: AuditFinding[]
  recommendations: AuditRecommendation[]
  priority_actions: string[]
  risk_areas: string[]
  quick_wins: string[]
  status: string
  created_at: string
  delivered_at: string | null
}

export interface AuditFinding {
  id: string
  audit_id: string
  category: string
  title: string
  description: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  impact: string
  recommendation: string
}

export interface AuditRecommendation {
  id: string
  audit_id: string
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
  estimated_effort: string
  estimated_impact: string
}

export interface GrowthOpportunity {
  id: string
  merchant_id: string
  category: string
  title: string
  description: string
  impact_score: number
  difficulty_score: number
  priority_level: string
  estimated_timeline: string
  estimated_outcome: string
  status: string
  created_at: string
}

export interface AIVisibilityData {
  id: string
  merchant_id: string
  chatgpt_visibility: number
  perplexity_visibility: number
  google_ai_overviews: number
  gemini_visibility: number
  claude_visibility: number
  entity_strength: number
  brand_mentions: number
  structured_data_presence: number
  knowledge_graph_presence: number
  ai_search_readiness_score: number
  recommendations: string[]
  topic_clusters: string[]
  faq_opportunities: string[]
  schema_opportunities: string[]
  created_at: string
}

export interface BenchmarkData {
  id: string
  merchant_id: string
  benchmark_type: string
  visibility_score: number
  authority_score: number
  content_score: number
  growth_score: number
  industry_average: number
  top_competitor_score: number
  previous_score: number
  created_at: string
}

export type AuditType = 
  | 'Store Audit'
  | 'SEO Audit'
  | 'Growth Audit'
  | 'Conversion Audit'
  | 'AI Visibility Audit'
  | 'Authority Audit'
  | 'Brand Audit'
  | 'Custom Audit'

export type AuditStatus = 'Draft' | 'In Review' | 'Completed' | 'Delivered'

export type OpportunityCategory = 
  | 'SEO'
  | 'Content'
  | 'Authority'
  | 'Conversion'
  | 'Retention'
  | 'AI Visibility'
  | 'Product Presentation'
  | 'Trust'
  | 'Email Marketing'
  | 'Automation'
  | 'Upsells'
  | 'Cross-Sells'
  | 'Brand Positioning'

export type OpportunityStatus = 'Identified' | 'In Progress' | 'Completed' | 'Deferred'