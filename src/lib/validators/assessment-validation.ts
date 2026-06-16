// src/lib/validators/assessment-validation.ts

import { FormData } from '@/types/growth-readiness'

export interface ValidationError {
  field: string
  message: string
}

export function validateStep(step: number, data: Partial<FormData>): ValidationError[] {
  const errors: ValidationError[] = []
  
  switch (step) {
    case 1:
      // Business Profile
      if (!data.business_name || data.business_name.trim().length < 2) {
        errors.push({ field: 'business_name', message: 'Business name is required' })
      }
      if (!data.contact_name || data.contact_name.trim().length < 2) {
        errors.push({ field: 'contact_name', message: 'Contact name is required' })
      }
      if (!data.email || !isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Valid email is required' })
      }
      if (!data.website || !isValidUrl(data.website)) {
        errors.push({ field: 'website', message: 'Valid website URL is required' })
      }
      if (!data.industry) {
        errors.push({ field: 'industry', message: 'Industry is required' })
      }
      if (!data.country) {
        errors.push({ field: 'country', message: 'Country is required' })
      }
      break
      
    case 2:
      // Business Stage
      if (!data.business_stage) {
        errors.push({ field: 'business_stage', message: 'Business stage is required' })
      }
      if (!data.store_age) {
        errors.push({ field: 'store_age', message: 'Store age is required' })
      }
      break
      
    case 3:
      // Growth Objectives
      if (!data.primary_goals || data.primary_goals.length === 0) {
        errors.push({ field: 'primary_goals', message: 'Select at least one growth goal' })
      }
      if (!data.success_vision || data.success_vision.trim().length < 10) {
        errors.push({ field: 'success_vision', message: 'Please describe your success vision (minimum 10 characters)' })
      }
      break
      
    case 4:
      // Visibility & Marketing
      if (!data.marketing_channels || data.marketing_channels.length === 0) {
        errors.push({ field: 'marketing_channels', message: 'Select at least one marketing channel' })
      }
      if (!data.best_channel) {
        errors.push({ field: 'best_channel', message: 'Please select your best performing channel' })
      }
      if (!data.paid_ads_usage) {
        errors.push({ field: 'paid_ads_usage', message: 'Please select paid ads usage' })
      }
      if (data.visibility_confidence === undefined || data.visibility_confidence < 1) {
        errors.push({ field: 'visibility_confidence', message: 'Please rate your visibility confidence' })
      }
      break
      
    case 5:
      // Customer Experience
      if (!data.email_capture) {
        errors.push({ field: 'email_capture', message: 'Please select email capture status' })
      }
      if (!data.email_automations) {
        errors.push({ field: 'email_automations', message: 'Please select email automation status' })
      }
      if (!data.customer_reviews) {
        errors.push({ field: 'customer_reviews', message: 'Please select customer reviews status' })
      }
      if (!data.content_publishing) {
        errors.push({ field: 'content_publishing', message: 'Please select content publishing frequency' })
      }
      if (!data.upsells_crosssells) {
        errors.push({ field: 'upsells_crosssells', message: 'Please select upsells/cross-sells status' })
      }
      break
      
    case 6:
      // Growth Challenges
      if (!data.biggest_challenge || data.biggest_challenge.trim().length < 10) {
        errors.push({ field: 'biggest_challenge', message: 'Please describe your biggest challenge (minimum 10 characters)' })
      }
      if (!data.main_obstacle || data.main_obstacle.trim().length < 10) {
        errors.push({ field: 'main_obstacle', message: 'Please describe your main obstacle (minimum 10 characters)' })
      }
      break
      
    case 7:
      // Growth Readiness
      if (!data.support_type) {
        errors.push({ field: 'support_type', message: 'Please select support type' })
      }
      if (!data.improvement_timeline) {
        errors.push({ field: 'improvement_timeline', message: 'Please select improvement timeline' })
      }
      if (!data.consent) {
        errors.push({ field: 'consent', message: 'You must consent to the data processing terms' })
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

export function getStepProgress(currentStep: number, totalSteps: number): number {
  return (currentStep / totalSteps) * 100
}

export function isStepComplete(step: number, data: Partial<FormData>): boolean {
  const errors = validateStep(step, data)
  return errors.length === 0
}