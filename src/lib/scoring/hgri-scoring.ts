// src/lib/scoring/hgri-scoring.ts

export interface ScoringInput {
  // Visibility
  marketingChannels: string[]
  contentPublishing: string
  visibilityConfidence: number
  
  // Conversion
  businessStage: string
  customerReviews: string
  upsellsCrosssells: string
  primaryGoals: string[]
  
  // Retention
  emailCapture: string
  emailAutomations: string
  
  // Scalability
  improvementTimeline: string
  supportType: string
}

export function calculateVisibilityScore(input: ScoringInput): number {
  let score = 0
  
  // Multiple discovery channels: up to 10 points
  if (input.marketingChannels && input.marketingChannels.length >= 4) score += 10
  else if (input.marketingChannels && input.marketingChannels.length >= 2) score += 6
  else if (input.marketingChannels && input.marketingChannels.length >= 1) score += 3
  
  // Regular content publishing: up to 5 points
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  else if (input.contentPublishing === 'Rarely') score += 1
  
  // Search visibility confidence: up to 5 points
  if (input.visibilityConfidence >= 8) score += 5
  else if (input.visibilityConfidence >= 5) score += 3
  else if (input.visibilityConfidence >= 3) score += 1
  
  return Math.min(score, 20)
}

export function calculateConversionScore(input: ScoringInput): number {
  let score = 0
  
  // Store stage and sales consistency: up to 8 points
  if (input.businessStage === 'Established' || input.businessStage === 'Scaling') score += 8
  else if (input.businessStage === 'Growing') score += 5
  else if (input.businessStage === 'Recently Launched') score += 3
  else score += 1
  
  // Customer reviews: up to 5 points
  if (input.customerReviews === 'Yes') score += 5
  else if (input.customerReviews === 'Some') score += 3
  
  // Upsells/cross-sells/bundles: up to 4 points
  if (input.upsellsCrosssells === 'Yes') score += 4
  else if (input.upsellsCrosssells === 'Partially') score += 2
  
  // Clear growth objective: up to 3 points
  if (input.primaryGoals && input.primaryGoals.length >= 3) score += 3
  else if (input.primaryGoals && input.primaryGoals.length >= 1) score += 1
  
  return Math.min(score, 20)
}

export function calculateRetentionScore(input: ScoringInput): number {
  let score = 0
  
  // Email capture: up to 5 points
  if (input.emailCapture === 'Yes') score += 5
  else if (input.emailCapture === 'Planning to') score += 2
  
  // Email automation: up to 5 points
  if (input.emailAutomations === 'Yes') score += 5
  else if (input.emailAutomations === 'Partially') score += 3
  
  // Repeat customer goal/strategy: up to 5 points
  if (input.primaryGoals && input.primaryGoals.includes('More Repeat Customers')) score += 5
  
  // Customer retention focus: up to 5 points
  if (input.primaryGoals && input.primaryGoals.includes('Customer Retention')) score += 5
  
  return Math.min(score, 20)
}

export function calculateAuthorityScore(input: ScoringInput): number {
  let score = 0
  
  // Brand positioning goal: up to 5 points
  if (input.primaryGoals && input.primaryGoals.includes('Brand Positioning')) score += 5
  
  // Reviews/social proof: up to 5 points
  if (input.customerReviews === 'Yes') score += 5
  else if (input.customerReviews === 'Some') score += 3
  
  // Content publishing: up to 5 points
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  else if (input.contentPublishing === 'Rarely') score += 1
  
  // Industry/business maturity: up to 5 points
  if (input.businessStage === 'Established' || input.businessStage === 'Scaling') score += 5
  else if (input.businessStage === 'Growing') score += 3
  else score += 1
  
  return Math.min(score, 20)
}

export function calculateScalabilityScore(input: ScoringInput): number {
  let score = 0
  
  // Business stage: up to 8 points
  if (input.businessStage === 'Scaling') score += 8
  else if (input.businessStage === 'Established') score += 6
  else if (input.businessStage === 'Growing') score += 4
  else if (input.businessStage === 'Recently Launched') score += 2
  else score += 1
  
  // Timeline urgency: up to 4 points
  if (input.improvementTimeline === 'Immediately') score += 4
  else if (input.improvementTimeline === '30 days') score += 3
  else if (input.improvementTimeline === '60 days') score += 2
  else if (input.improvementTimeline === '90 days') score += 1
  
  // Support readiness: up to 5 points
  if (input.supportType === 'Looking for implementation support') score += 5
  else if (input.supportType === 'Looking for strategy') score += 4
  else if (input.supportType === 'Looking for guidance') score += 3
  else score += 1
  
  // Operational efficiency goal: up to 3 points
  if (input.primaryGoals && input.primaryGoals.includes('Operational Efficiency')) score += 3
  
  return Math.min(score, 20)
}

export function calculateHGRI(
  visibility: number,
  conversion: number,
  retention: number,
  authority: number,
  scalability: number
): { total: number; classification: string } {
  const total = visibility + conversion + retention + authority + scalability
  
  let classification = 'Foundation Stage'
  if (total >= 80) classification = 'Scale Ready'
  else if (total >= 60) classification = 'Growth Ready'
  else if (total >= 40) classification = 'Growth Potential'
  
  return { total, classification }
}

export function detectPrimaryConstraint(input: ScoringInput): { constraint: string; focus: string } {
  const constraints: { constraint: string; focus: string }[] = []
  
  // Visibility constraint
  if (
    input.primaryGoals?.includes('More Traffic') &&
    input.contentPublishing !== 'Weekly' &&
    input.visibilityConfidence < 5
  ) {
    constraints.push({ constraint: 'Visibility', focus: 'SEO & Content Authority' })
  }
  
  // Conversion constraint
  if (
    input.primaryGoals?.includes('More Sales') &&
    input.customerReviews !== 'Yes' &&
    input.upsellsCrosssells !== 'Yes'
  ) {
    constraints.push({ constraint: 'Conversion', focus: 'Conversion Optimization' })
  }
  
  // Retention constraint
  if (
    input.primaryGoals?.includes('More Repeat Customers') &&
    input.emailAutomations !== 'Yes'
  ) {
    constraints.push({ constraint: 'Retention', focus: 'Email Retention System' })
  }
  
  // Authority constraint
  if (
    input.primaryGoals?.includes('Brand Positioning') &&
    input.customerReviews !== 'Yes' &&
    input.contentPublishing !== 'Weekly'
  ) {
    constraints.push({ constraint: 'Authority', focus: 'Brand Authority Building' })
  }
  
  // Scalability constraint
  if (
    input.businessStage === 'Scaling' &&
    input.primaryGoals?.includes('Operational Efficiency')
  ) {
    constraints.push({ constraint: 'Scalability', focus: 'Growth Infrastructure' })
  }
  
  // Default if no constraints detected
  if (constraints.length === 0) {
    constraints.push({ constraint: 'Unknown', focus: 'Growth Optimization' })
  }
  
  // Return the most severe constraint (first one)
  return constraints[0]
}

// Helper: Get classification color for badges
export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'Scale Ready':
      return 'bg-gradient-to-r from-green-400 to-emerald-500'
    case 'Growth Ready':
      return 'bg-gradient-to-r from-blue-400 to-cyan-500'
    case 'Growth Potential':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500'
    default:
      return 'bg-gradient-to-r from-gray-400 to-gray-500'
  }
}

// Helper: Get status color for admin
export function getStatusColor(status: string): string {
  switch (status) {
    case 'New Submission':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'Under Review':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'Growth Profile Issued':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'Opportunity Review Candidate':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    case 'Opportunity Review Sent':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    case 'Growth Support Eligible':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    case 'Growth Partner':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
    case 'Client':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'Archived':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}