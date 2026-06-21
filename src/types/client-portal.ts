export interface Client {
  id: string
  user_id: string
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  status: string
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  project_id: string
  project_name: string
  service_selected: string
  status: string
  progress: number
  start_date: string
  expected_completion_date: string
  description: string
  created_at: string
  client?: Client
}

export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'awaiting_client'
  due_date: string
  completed_at: string | null
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  client_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  category: string
  uploaded_by: string
  uploaded_at: string
}

export interface ProjectRequest {
  id: string
  project_id: string
  client_id: string
  title: string
  description: string
  status: 'open' | 'client_responded' | 'completed' | 'closed'
  due_date: string
  response: string | null
  created_at: string
  completed_at: string | null
}

export interface ProjectMessage {
  id: string
  project_id: string
  sender_id: string
  sender_role: 'admin' | 'client'
  message: string
  attachment_url: string | null
  created_at: string
}

export interface ProjectDeliverable {
  id: string
  project_id: string
  title: string
  description: string
  file_url: string
  version: string
  uploaded_at: string
}

export interface ProjectInvoice {
  id: string
  project_id: string
  invoice_number: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  payment_link: string | null
  created_at: string
}

export interface ProjectUpdate {
  id: string
  project_id: string
  title: string
  description: string
  created_by: string
  created_at: string
}