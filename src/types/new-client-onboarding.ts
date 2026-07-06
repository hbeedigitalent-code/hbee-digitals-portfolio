// src/types/new-client-onboarding.ts

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export interface NewOnboardingFormData {
  // Step 1: Project Details
  project_title: string
  business_name: string
  website_url: string
  service_needed: string
  project_goals: string
  
  // Step 2: Timeline & Budget
  preferred_timeline: string
  budget_range: string
  main_challenge: string
  
  // Step 3: Brand Assets
  uploaded_files: File[]
  
  // Step 4: Contact Information
  full_name: string
  email: string
  whatsapp: string
  communication_method: string
  notes: string
  
  // Step 5: Review & Submit
  consent: boolean
}