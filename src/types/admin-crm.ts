export interface Lead {
  id: string
  lead_name: string
  business_name: string
  email: string
  whatsapp: string
  website: string
  source: string
  industry: string
  country: string
  status: string
  last_contact_date: string
  next_follow_up_date: string
  notes: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  client_id: string | null
  project_id: string | null
  lead_id: string | null
  assigned_to: string | null
  priority: string
  status: string
  due_date: string
  created_at: string
  completed_at: string | null
}

export interface Proposal {
  id: string
  proposal_number: string
  lead_id: string | null
  client_id: string | null
  project_id: string | null
  business_name: string
  project_title: string
  scope: string
  deliverables: string[]
  timeline: string
  investment: number
  payment_structure: string
  terms: string
  status: string
  share_link: string | null
  created_at: string
}

export interface Agreement {
  id: string
  agreement_number: string
  client_id: string
  project_id: string | null
  scope: string
  deliverables: string[]
  timeline: string
  payment_terms: string
  revision_policy: string
  confidentiality_clause: string
  ownership_terms: string
  status: string
  signature_status: string
  signed_file_url: string | null
  created_at: string
}

export interface InternalNote {
  id: string
  related_type: string
  related_id: string
  note: string
  created_by: string
  created_at: string
}

export type LeadSource = 
  | 'Cold Outreach'
  | 'LinkedIn'
  | 'Referral'
  | 'Growth Assessment'
  | 'Website'
  | 'Returning Client'
  | 'Partner Referral'
  | 'Other'

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Assessment Submitted'
  | 'Audit Sent'
  | 'Proposal Sent'
  | 'Negotiating'
  | 'Won'
  | 'Lost'
  | 'Archived'

export type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Waiting On Client'
  | 'Completed'
  | 'Cancelled'

export type TaskPriority =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Urgent'

export type ProposalStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Approved'
  | 'Rejected'
  | 'Expired'

export type AgreementStatus =
  | 'Draft'
  | 'Sent'
  | 'Signed'
  | 'Declined'
  | 'Expired'