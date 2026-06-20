export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface OnboardingFormData {
  // Step 1: Client Information
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  industry: string
  business_stage: string
  monthly_revenue: string
  heard_about_us: string
  
  // Step 2: Project Details
  services_required: string[]
  project_goal: string
  main_challenge: string
  priority_1: string
  priority_2: string
  priority_3: string
  target_outcome: string
  expected_deadline: string
  budget_range: string
  
  // Step 3: Business & Marketing
  target_audience: string
  traffic_sources: string[]
  marketing_challenges: string
  competitors: string[]
  inspiration_websites: string[]
  email_platform: string
  crm: string
  
  // Step 4: Brand Information
  brand_mission: string
  brand_values: string
  brand_voice: string
  brand_colors: string
  brand_fonts: string
  target_customer_profile: string
  existing_brand_guidelines: string
  
  // Step 5: Store Access
  platform: string
  needs_collaborator_access: string
  collaborator_request_code: string
  staff_access_email: string
  store_login_url: string
  access_instructions: string
  technical_notes: string
  
  // Step 6: Team & Approvals
  decision_maker_name: string
  decision_maker_role: string
  decision_maker_email: string
  decision_maker_phone: string
  team_members: { name: string; role: string; email: string }[]
  
  // Step 7: Asset Center
  uploaded_files: File[]
  large_file_links: { name: string; url: string }[]
  
  // Step 8: Additional Requests
  additional_requests: string
  special_instructions: string
  success_metrics: string
  
  // Step 9: Review & Submit
  consent: boolean
}

export interface ClientOnboardingSubmission {
  id: string
  project_id: string
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  industry: string
  business_stage: string
  monthly_revenue: string
  heard_about_us: string
  services_required: string[]
  project_goal: string
  main_challenge: string
  priority_1: string
  priority_2: string
  priority_3: string
  target_outcome: string
  expected_deadline: string
  budget_range: string
  target_audience: string
  traffic_sources: string[]
  marketing_challenges: string
  competitors: string[]
  inspiration_websites: string[]
  email_platform: string
  crm: string
  brand_mission: string
  brand_values: string
  brand_voice: string
  brand_colors: string
  brand_fonts: string
  target_customer_profile: string
  existing_brand_guidelines: string
  platform: string
  needs_collaborator_access: string
  collaborator_request_code: string
  staff_access_email: string
  store_login_url: string
  access_instructions: string
  technical_notes: string
  decision_maker_name: string
  decision_maker_role: string
  decision_maker_email: string
  decision_maker_phone: string
  team_members: { name: string; role: string; email: string }[]
  large_file_links: { name: string; url: string }[]
  additional_requests: string
  special_instructions: string
  success_metrics: string
  consent: boolean
  status: string
  internal_notes: string
  created_at: string
}