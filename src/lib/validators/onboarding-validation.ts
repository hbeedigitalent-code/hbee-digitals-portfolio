import { OnboardingFormData, OnboardingStep } from '@/types/client-onboarding'

export interface ValidationError {
  field: string
  message: string
}

export function validateOnboardingStep(step: OnboardingStep, data: Partial<OnboardingFormData>): ValidationError[] {
  const errors: ValidationError[] = []
  
  switch (step) {
    case 1:
      if (!data.full_name || data.full_name.trim().length < 2) {
        errors.push({ field: 'full_name', message: 'Full name is required' })
      }
      if (!data.email || !isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Valid email is required' })
      }
      if (!data.business_name || data.business_name.trim().length < 2) {
        errors.push({ field: 'business_name', message: 'Business name is required' })
      }
      if (!data.website_url || !isValidUrl(data.website_url)) {
        errors.push({ field: 'website_url', message: 'Valid website URL is required' })
      }
      if (!data.industry) {
        errors.push({ field: 'industry', message: 'Industry is required' })
      }
      if (!data.country) {
        errors.push({ field: 'country', message: 'Country is required' })
      }
      if (!data.business_stage) {
        errors.push({ field: 'business_stage', message: 'Business stage is required' })
      }
      break
      
    case 2:
      if (!data.services_required || data.services_required.length === 0) {
        errors.push({ field: 'services_required', message: 'Select at least one service' })
      }
      if (!data.project_goal || data.project_goal.trim().length < 10) {
        errors.push({ field: 'project_goal', message: 'Project goal is required (minimum 10 characters)' })
      }
      if (!data.target_outcome || data.target_outcome.trim().length < 10) {
        errors.push({ field: 'target_outcome', message: 'Target outcome is required (minimum 10 characters)' })
      }
      if (!data.budget_range) {
        errors.push({ field: 'budget_range', message: 'Budget range is required' })
      }
      break
      
    case 3:
      if (!data.target_audience || data.target_audience.trim().length < 5) {
        errors.push({ field: 'target_audience', message: 'Target audience is required' })
      }
      if (!data.traffic_sources || data.traffic_sources.length === 0) {
        errors.push({ field: 'traffic_sources', message: 'Select at least one traffic source' })
      }
      break
      
    case 4:
      if (!data.brand_mission || data.brand_mission.trim().length < 10) {
        errors.push({ field: 'brand_mission', message: 'Brand mission is required (minimum 10 characters)' })
      }
      if (!data.brand_values || data.brand_values.trim().length < 10) {
        errors.push({ field: 'brand_values', message: 'Brand values are required (minimum 10 characters)' })
      }
      if (!data.target_customer_profile || data.target_customer_profile.trim().length < 10) {
        errors.push({ field: 'target_customer_profile', message: 'Target customer profile is required (minimum 10 characters)' })
      }
      break
      
    case 5:
      if (!data.platform) {
        errors.push({ field: 'platform', message: 'Platform selection is required' })
      }
      if (!data.needs_collaborator_access) {
        errors.push({ field: 'needs_collaborator_access', message: 'Please specify collaborator access needs' })
      }
      break
      
    case 6:
      if (!data.decision_maker_name || data.decision_maker_name.trim().length < 2) {
        errors.push({ field: 'decision_maker_name', message: 'Decision maker name is required' })
      }
      if (!data.decision_maker_email || !isValidEmail(data.decision_maker_email)) {
        errors.push({ field: 'decision_maker_email', message: 'Valid decision maker email is required' })
      }
      break
      
    case 9:
      if (!data.consent) {
        errors.push({ field: 'consent', message: 'You must consent to the terms' })
      }
      break
  }
  
  return errors
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isOnboardingStepComplete(step: OnboardingStep, data: Partial<OnboardingFormData>): boolean {
  const errors = validateOnboardingStep(step, data)
  return errors.length === 0
}