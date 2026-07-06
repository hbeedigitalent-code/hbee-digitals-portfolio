// src/types/project-request.ts

export interface ProjectRequest {
  id: string
  client_id: string
  user_id: string
  project_title: string
  business_name: string
  service_needed: string
  description: string
  preferred_timeline: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  budget_range?: string
  status: 'Pending Review' | 'Under Review' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected'
  created_at: string
  updated_at: string
}

export interface QuickProjectRequestData {
  project_title: string
  business_name: string
  service_needed: string
  description: string
  preferred_timeline: string
  priority: string
  budget_range?: string
}