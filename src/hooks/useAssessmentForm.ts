'use client'

import { useState, useCallback, useEffect } from 'react'
import { FormData, FormStep } from '@/types/growth-readiness'
import { validateStep, isStepComplete } from '@/lib/validators/assessment-validation'

const initialFormData: FormData = {
  // Step 1: Business Profile
  business_name: '',
  website: '',
  contact_name: '',
  email: '',
  country: '',
  industry: '',
  
  // Step 2: Business Stage
  business_stage: '',
  store_age: '',
  
  // Step 3: Growth Objectives
  primary_goals: [],
  success_vision: '',
  
  // Step 4: Visibility & Marketing
  marketing_channels: [],
  best_channel: '',
  paid_ads_usage: '',
  paid_ad_platforms: [],
  visibility_confidence: 5,
  
  // Step 5: Customer Experience
  email_capture: '',
  email_automations: '',
  customer_reviews: '',
  content_publishing: '',
  upsells_crosssells: '',
  
  // Step 6: Growth Challenges
  biggest_challenge: '',
  main_obstacle: '',
  
  // Step 7: Growth Readiness
  support_type: '',
  improvement_timeline: '',
  uploaded_file: null,
  consent: false
}

export function useAssessmentForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('growth_assessment_draft')
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
      localStorage.setItem('growth_assessment_draft', JSON.stringify(formData))
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [errors])

  const goToStep = useCallback((step: FormStep) => {
    // Validate current step before proceeding
    if (step > currentStep) {
      const stepErrors = validateStep(currentStep, formData)
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
    if (currentStep < 7) {
      return goToStep((currentStep + 1) as FormStep)
    }
    return true
  }, [currentStep, goToStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FormStep)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const validateCurrentStep = useCallback(() => {
    const stepErrors = validateStep(currentStep, formData)
    if (stepErrors.length > 0) {
      const errorMap: Record<string, string> = {}
      stepErrors.forEach(err => {
        errorMap[err.field] = err.message
      })
      setErrors(errorMap)
      return false
    }
    setErrors({})
    return true
  }, [currentStep, formData])

  const isCurrentStepComplete = useCallback(() => {
    return isStepComplete(currentStep, formData)
  }, [currentStep, formData])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(1)
    setErrors({})
    localStorage.removeItem('growth_assessment_draft')
  }, [])

  const submitForm = useCallback(async () => {
    // Validate all steps before submission
    for (let step = 1; step <= 7; step++) {
      const stepErrors = validateStep(step as FormStep, formData)
      if (stepErrors.length > 0) {
        setCurrentStep(step as FormStep)
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
      const response = await fetch('/api/growth-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit assessment')
      }

      setIsSubmitted(true)
      localStorage.removeItem('growth_assessment_draft')
      return true
    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit assessment' })
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
    validateCurrentStep,
    isCurrentStepComplete,
    resetForm,
    submitForm
  }
}