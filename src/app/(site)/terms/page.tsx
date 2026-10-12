import type { Metadata } from 'next'

import { LegalDocument } from '@/components/site/legal/LegalDocument'
import { pageMetadata } from '@/lib/site/seo'

// Title and description are unchanged from the existing legal page.
export const metadata: Metadata = pageMetadata({
  absoluteTitle: "Terms of Service | Hbee Digitals",
  description: "Terms of Service for Hbee Digitals.",
  path: '/terms',
})

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By using our website or requesting our services, you agree to these terms and any project-specific agreement provided by Hbee Digitals.',
  },
  {
    title: 'Services',
    body: 'We provide digital services including website design, Shopify optimization, branding, digital systems, support, consulting, and related services.',
  },
  {
    title: 'Project Scope',
    body: 'Each project will follow the agreed scope, deliverables, timeline, and pricing discussed before work begins. Additional requests may require a revised quote.',
  },
  {
    title: 'Payments',
    body: 'Payments must be made according to the agreed invoice or payment schedule. Work may be paused if payment is delayed.',
  },
  {
    title: 'Client Responsibilities',
    body: 'Clients are responsible for providing accurate information, required access, brand materials, content, feedback, and approvals needed to complete the project.',
  },
  {
    title: 'Revisions',
    body: 'Revisions are handled based on the agreed project scope. Extra revisions or major direction changes may attract additional fees.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Hbee Digitals is not liable for indirect losses, third-party platform issues, hosting outages, payment provider issues, or business losses outside our direct control.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms when necessary. Continued use of our website or services means you accept the updated terms.',
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      intro="These terms explain how our services, projects, payments, and responsibilities are handled."
      sections={sections}
      closing={{ title: "Need clarification?", body: "Contact us before starting a project if you need any part of these terms explained.", href: "/contact", cta: "Contact Us" }}
    />
  )
}
