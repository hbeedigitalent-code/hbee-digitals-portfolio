import type { Metadata } from 'next'

import { LegalDocument } from '@/components/site/legal/LegalDocument'
import { pageMetadata } from '@/lib/site/seo'

// Title and description are unchanged from the existing legal page.
export const metadata: Metadata = pageMetadata({
  absoluteTitle: "Privacy Policy | Hbee Digitals",
  description: "Privacy Policy for Hbee Digitals.",
  path: '/privacy',
})

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect your name, email address, phone number, company name, project details, and any information you submit through our contact forms or communication channels.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to respond to enquiries, provide services, improve our website, manage client communication, send updates, and maintain business records.',
  },
  {
    title: 'Newsletter & Communication',
    body: 'If you subscribe to our newsletter, we may send you helpful updates, insights, and service-related content. You may unsubscribe at any time.',
  },
  {
    title: 'Cookies & Analytics',
    body: 'We may use cookies and analytics tools to understand website performance, improve user experience, and measure traffic behavior.',
  },
  {
    title: 'Data Protection',
    body: 'We take reasonable steps to protect your information from unauthorized access, loss, misuse, or disclosure.',
  },
  {
    title: 'Third-Party Services',
    body: 'We may use trusted third-party platforms such as Supabase, Vercel, Resend, analytics tools, and payment or communication providers to operate our services.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access, correction, or deletion of your personal information by contacting us directly.',
  },
]

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="This policy explains how Hbee Digitals collects, uses, and protects information shared with us."
      sections={sections}
      closing={{ title: "Contact Us", body: "For privacy questions, contact us through our contact page.", href: "/contact", cta: "Contact Hbee Digitals" }}
    />
  )
}
