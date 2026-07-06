// src/lib/validators/onboarding-validation.ts
import { NewOnboardingFormData, OnboardingStep } from '@/types/new-client-onboarding'

export interface ValidationError {
  field: string
  message: string
}

export function validateOnboardingStep(
  step: OnboardingStep,
  data: NewOnboardingFormData
): ValidationError[] {
  const errors: ValidationError[] = []

  switch (step) {
    case 1:
      if (!data.project_title?.trim()) {
        errors.push({ field: 'project_title', message: 'Project title is required' })
      }
      if (!data.business_name?.trim()) {
        errors.push({ field: 'business_name', message: 'Business name is required' })
      }
      if (!data.service_needed) {
        errors.push({ field: 'service_needed', message: 'Service needed is required' })
      }
      if (!data.project_goals?.trim()) {
        errors.push({ field: 'project_goals', message: 'Project goals are required' })
      }
      break

    case 2:
      if (!data.preferred_timeline) {
        errors.push({ field: 'preferred_timeline', message: 'Timeline is required' })
      }
      if (!data.budget_range) {
        errors.push({ field: 'budget_range', message: 'Budget range is required' })
      }
      if (!data.main_challenge?.trim()) {
        errors.push({ field: 'main_challenge', message: 'Main challenge is required' })
      }
      break

    case 3:
      // Optional - no validation needed
      break

    case 4:
      if (!data.full_name?.trim()) {
        errors.push({ field: 'full_name', message: 'Full name is required' })
      }
      if (!data.email?.trim()) {
        errors.push({ field: 'email', message: 'Email is required' })
      }
      if (!data.whatsapp?.trim()) {
        errors.push({ field: 'whatsapp', message: 'WhatsApp number is required' })
      }
      if (!data.communication_method) {
        errors.push({ field: 'communication_method', message: 'Communication method is required' })
      }
      break

    case 5:
      if (!data.consent) {
        errors.push({ field: 'consent', message: 'You must consent to proceed' })
      }
      break

    default:
      break
  }

  return errors
}

export function isOnboardingStepComplete(
  step: OnboardingStep,
  data: NewOnboardingFormData
): boolean {
  const errors = validateOnboardingStep(step, data)
  return errors.length === 0
}