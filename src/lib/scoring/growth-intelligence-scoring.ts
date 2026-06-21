export interface ScoringInput {
  // From Growth Assessment
  marketingChannels: string[]
  contentPublishing: string
  visibilityConfidence: number
  businessStage: string
  customerReviews: string
  upsellsCrosssells: string
  primaryGoals: string[]
  emailCapture: string
  emailAutomations: string
  improvementTimeline: string
  supportType: string
  
  // Additional inputs for AI visibility
  brandMentions?: number
  structuredData?: boolean
  knowledgeGraph?: boolean
}

export function calculateVisibilityScore(input: ScoringInput): number {
  let score = 0
  if (input.marketingChannels && input.marketingChannels.length >= 4) score += 10
  else if (input.marketingChannels && input.marketingChannels.length >= 2) score += 6
  else if (input.marketingChannels && input.marketingChannels.length >= 1) score += 3
  
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  else if (input.contentPublishing === 'Rarely') score += 1
  
  if (input.visibilityConfidence >= 8) score += 5
  else if (input.visibilityConfidence >= 5) score += 3
  else if (input.visibilityConfidence >= 3) score += 1
  
  return Math.min(score, 20)
}

export function calculateConversionScore(input: ScoringInput): number {
  let score = 0
  if (input.businessStage === 'Established' || input.businessStage === 'Scaling') score += 8
  else if (input.businessStage === 'Growing') score += 5
  else if (input.businessStage === 'Recently Launched') score += 3
  else score += 1
  
  if (input.customerReviews === 'Yes') score += 5
  else if (input.customerReviews === 'Some') score += 3
  
  if (input.upsellsCrosssells === 'Yes') score += 4
  else if (input.upsellsCrosssells === 'Partially') score += 2
  
  if (input.primaryGoals && input.primaryGoals.length >= 3) score += 3
  else if (input.primaryGoals && input.primaryGoals.length >= 1) score += 1
  
  return Math.min(score, 20)
}

export function calculateRetentionScore(input: ScoringInput): number {
  let score = 0
  if (input.emailCapture === 'Yes') score += 5
  else if (input.emailCapture === 'Planning to') score += 2
  
  if (input.emailAutomations === 'Yes') score += 5
  else if (input.emailAutomations === 'Partially') score += 3
  
  if (input.primaryGoals && input.primaryGoals.includes('More Repeat Customers')) score += 5
  if (input.primaryGoals && input.primaryGoals.includes('Customer Retention')) score += 5
  
  return Math.min(score, 20)
}

export function calculateAuthorityScore(input: ScoringInput): number {
  let score = 0
  if (input.primaryGoals && input.primaryGoals.includes('Brand Positioning')) score += 5
  
  if (input.customerReviews === 'Yes') score += 5
  else if (input.customerReviews === 'Some') score += 3
  
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  else if (input.contentPublishing === 'Rarely') score += 1
  
  if (input.businessStage === 'Established' || input.businessStage === 'Scaling') score += 5
  else if (input.businessStage === 'Growing') score += 3
  else score += 1
  
  return Math.min(score, 20)
}

export function calculateScalabilityScore(input: ScoringInput): number {
  let score = 0
  if (input.businessStage === 'Scaling') score += 8
  else if (input.businessStage === 'Established') score += 6
  else if (input.businessStage === 'Growing') score += 4
  else if (input.businessStage === 'Recently Launched') score += 2
  else score += 1
  
  if (input.improvementTimeline === 'Immediately') score += 4
  else if (input.improvementTimeline === '30 days') score += 3
  else if (input.improvementTimeline === '60 days') score += 2
  else if (input.improvementTimeline === '90 days') score += 1
  
  if (input.supportType === 'Looking for implementation support') score += 5
  else if (input.supportType === 'Looking for strategy') score += 4
  else if (input.supportType === 'Looking for guidance') score += 3
  else score += 1
  
  if (input.primaryGoals && input.primaryGoals.includes('Operational Efficiency')) score += 3
  
  return Math.min(score, 20)
}

export function calculateAIVisibilityScore(input: ScoringInput): number {
  let score = 0
  
  // Brand mentions: 0-5 points
  if (input.brandMentions && input.brandMentions >= 50) score += 5
  else if (input.brandMentions && input.brandMentions >= 20) score += 3
  else if (input.brandMentions && input.brandMentions >= 5) score += 1
  
  // Structured data: 0-5 points
  if (input.structuredData) score += 5
  
  // Knowledge Graph presence: 0-5 points
  if (input.knowledgeGraph) score += 5
  
  // Content quality (using content publishing as proxy): 0-5 points
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  else if (input.contentPublishing === 'Rarely') score += 1
  
  return Math.min(score, 20)
}

export function calculateBrandStrengthScore(input: ScoringInput): number {
  let score = 0
  
  if (input.primaryGoals && input.primaryGoals.includes('Brand Positioning')) score += 5
  
  if (input.customerReviews === 'Yes') score += 5
  else if (input.customerReviews === 'Some') score += 3
  
  if (input.businessStage === 'Established' || input.businessStage === 'Scaling') score += 5
  else if (input.businessStage === 'Growing') score += 3
  
  if (input.contentPublishing === 'Weekly') score += 5
  else if (input.contentPublishing === 'Monthly') score += 3
  
  return Math.min(score, 20)
}

export function calculateContentStrengthScore(input: ScoringInput): number {
  let score = 0
  
  if (input.contentPublishing === 'Weekly') score += 8
  else if (input.contentPublishing === 'Monthly') score += 5
  else if (input.contentPublishing === 'Rarely') score += 2
  
  if (input.primaryGoals && input.primaryGoals.includes('SEO Performance')) score += 6
  if (input.primaryGoals && input.primaryGoals.includes('Better Visibility')) score += 6
  
  return Math.min(score, 20)
}

export function calculateOverallScore(scores: {
  visibility: number
  conversion: number
  retention: number
  authority: number
  scalability: number
  aiVisibility: number
  brandStrength: number
  contentStrength: number
}): { total: number; classification: string } {
  const total = 
    scores.visibility +
    scores.conversion +
    scores.retention +
    scores.authority +
    scores.scalability +
    scores.aiVisibility +
    scores.brandStrength +
    scores.contentStrength
  
  const maxPossible = 160 // 8 categories * 20
  const percentage = Math.round((total / maxPossible) * 100)
  
  let classification = 'Foundation Stage'
  if (percentage >= 80) classification = 'Scale Ready'
  else if (percentage >= 60) classification = 'Growth Ready'
  else if (percentage >= 40) classification = 'Growth Potential'
  
  return { total: percentage, classification }
}

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