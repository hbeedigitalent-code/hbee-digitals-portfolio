// src/hooks/useNewOnboardingForm.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { NewOnboardingFormData, OnboardingStep } from '@/types/new-client-onboarding'
import { createClientComponentClient } from '@/lib/supabase-client'

const initialFormData: NewOnboardingFormData = {
  project_title: '',
  business_name: '',
  website_url: '',
  service_needed: '',
  project_goals: '',
  preferred_timeline: '',
  budget_range: '',
  main_challenge: '',
  uploaded_files: [],
  full_name: '',
  email: '',
  whatsapp: '',
  communication_method: '',
  notes: '',
  consent: false
}

export function useNewOnboardingForm() {
  const supabase = createClientComponentClient()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [formData, setFormData] = useState<NewOnboardingFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('new_onboarding_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to load saved form data:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (formData.business_name || formData.email) {
      localStorage.setItem('new_onboarding_draft', JSON.stringify(formData))
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof NewOnboardingFormData>(
    field: K,
    value: NewOnboardingFormData[K]
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

  const validateStep = useCallback((step: OnboardingStep): Record<string, string> => {
    const stepErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.project_title?.trim()) stepErrors.project_title = 'Project title is required'
        if (!formData.business_name?.trim()) stepErrors.business_name = 'Business name is required'
        if (!formData.service_needed) stepErrors.service_needed = 'Service is required'
        if (!formData.project_goals?.trim()) stepErrors.project_goals = 'Project goals are required'
        break
      case 2:
        if (!formData.preferred_timeline) stepErrors.preferred_timeline = 'Timeline is required'
        if (!formData.budget_range) stepErrors.budget_range = 'Budget range is required'
        if (!formData.main_challenge?.trim()) stepErrors.main_challenge = 'Main challenge is required'
        break
      case 3:
        break
      case 4:
        if (!formData.full_name?.trim()) stepErrors.full_name = 'Full name is required'
        if (!formData.email?.trim()) stepErrors.email = 'Email is required'
        if (!formData.whatsapp?.trim()) stepErrors.whatsapp = 'WhatsApp is required'
        if (!formData.communication_method) stepErrors.communication_method = 'Communication method is required'
        break
      case 5:
        if (!formData.consent) stepErrors.consent = 'You must consent to proceed'
        break
    }

    return stepErrors
  }, [formData])

  const goToStep = useCallback((step: OnboardingStep) => {
    if (step > currentStep) {
      const stepErrors = validateStep(currentStep)
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors)
        return false
      }
    }
    setCurrentStep(step)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }, [currentStep, validateStep])

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
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
    const stepErrors = validateStep(currentStep)
    return Object.keys(stepErrors).length === 0
  }, [currentStep, validateStep])

  const submitForm = useCallback(async () => {
    // Validate all steps
    for (let step = 1; step <= 5; step++) {
      const stepErrors = validateStep(step as OnboardingStep)
      if (Object.keys(stepErrors).length > 0) {
        setCurrentStep(step as OnboardingStep)
        setErrors(stepErrors)
        return false
      }
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setErrors({ submit: 'You must be logged in to submit' })
      return false
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const formDataToSend = new FormData()
      
      const { uploaded_files, ...dataWithoutFiles } = formData
      formDataToSend.append('data', JSON.stringify(dataWithoutFiles))
      
      if (uploaded_files && uploaded_files.length > 0) {
        for (const file of uploaded_files) {
          formDataToSend.append('files', file)
        }
      }

      console.log('📤 Submitting onboarding...')
      
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: formDataToSend,
      })

      const result = await response.json()
      console.log('📥 Response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit onboarding')
      }

      setIsSubmitted(true)
      localStorage.removeItem('new_onboarding_draft')
      return true
    } catch (error) {
      console.error('❌ Submission error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit onboarding' })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateStep, supabase])

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
    submitForm
  }
}