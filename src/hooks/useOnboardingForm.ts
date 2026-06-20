'use client'

import { useState, useCallback, useEffect } from 'react'
import { OnboardingFormData, OnboardingStep } from '@/types/client-onboarding'
import { validateOnboardingStep, isOnboardingStepComplete } from '@/lib/validators/onboarding-validation'

const initialFormData: OnboardingFormData = {
  // Step 1
  full_name: '',
  email: '',
  whatsapp: '',
  business_name: '',
  website_url: '',
  country: '',
  industry: '',
  business_stage: '',
  monthly_revenue: '',
  heard_about_us: '',
  
  // Step 2
  services_required: [],
  project_goal: '',
  main_challenge: '',
  priority_1: '',
  priority_2: '',
  priority_3: '',
  target_outcome: '',
  expected_deadline: '',
  budget_range: '',
  
  // Step 3
  target_audience: '',
  traffic_sources: [],
  marketing_challenges: '',
  competitors: [],
  inspiration_websites: [],
  email_platform: '',
  crm: '',
  
  // Step 4
  brand_mission: '',
  brand_values: '',
  brand_voice: '',
  brand_colors: '',
  brand_fonts: '',
  target_customer_profile: '',
  existing_brand_guidelines: '',
  
  // Step 5
  platform: '',
  needs_collaborator_access: '',
  collaborator_request_code: '',
  staff_access_email: '',
  store_login_url: '',
  access_instructions: '',
  technical_notes: '',
  
  // Step 6
  decision_maker_name: '',
  decision_maker_role: '',
  decision_maker_email: '',
  decision_maker_phone: '',
  team_members: [],
  
  // Step 7
  uploaded_files: [],
  large_file_links: [],
  
  // Step 8
  additional_requests: '',
  special_instructions: '',
  success_metrics: '',
  
  // Step 9
  consent: false
}

export function useOnboardingForm() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to load saved form data:', e)
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (formData.business_name || formData.email) {
      localStorage.setItem('onboarding_draft', JSON.stringify(formData))
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [errors])

  const goToStep = useCallback((step: OnboardingStep) => {
    if (step > currentStep) {
      const stepErrors = validateOnboardingStep(currentStep, formData)
      if (stepErrors.length > 0) {
        const errorMap: Record<string, string> = {}
        stepErrors.forEach(err => {
          errorMap[err.field] = err.message
        })
        setErrors(errorMap)
        return false
      }
    }
    setCurrentStep(step)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }, [currentStep, formData])

  const nextStep = useCallback(() => {
    if (currentStep < 9) {
      return goToStep((currentStep + 1) as OnboardingStep)
    }
    return true
  }, [currentStep, goToStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const isCurrentStepComplete = useCallback(() => {
    return isOnboardingStepComplete(currentStep, formData)
  }, [currentStep, formData])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(1)
    setErrors({})
    localStorage.removeItem('onboarding_draft')
  }, [])

  const submitForm = useCallback(async () => {
    for (let step = 1; step <= 9; step++) {
      const stepErrors = validateOnboardingStep(step as OnboardingStep, formData)
      if (stepErrors.length > 0) {
        setCurrentStep(step as OnboardingStep)
        const errorMap: Record<string, string> = {}
        stepErrors.forEach(err => {
          errorMap[err.field] = err.message
        })
        setErrors(errorMap)
        return false
      }
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit onboarding')
      }

      setIsSubmitted(true)
      localStorage.removeItem('onboarding_draft')
      return true
    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit onboarding' })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [formData])

  return {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    goToStep,
    nextStep,
    prevStep,
    isCurrentStepComplete,
    resetForm,
    submitForm
  }
}