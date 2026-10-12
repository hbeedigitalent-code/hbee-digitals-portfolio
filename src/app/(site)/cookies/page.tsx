import type { Metadata } from 'next'

import { LegalDocument } from '@/components/site/legal/LegalDocument'
import { pageMetadata } from '@/lib/site/seo'

// Title and description are unchanged from the existing legal page.
export const metadata: Metadata = pageMetadata({
  absoluteTitle: "Cookie Policy | Hbee Digitals",
  description: "Cookie Policy for Hbee Digitals.",
  path: '/cookies',
})

const sections = [
  {
    title: 'What Are Cookies?',
    body: 'Cookies are small files stored on your device to help websites remember preferences, improve functionality, and understand visitor behavior.',
  },
  {
    title: 'How We Use Cookies',
    body: 'We may use cookies to improve website performance, understand traffic, personalize browsing, remember preferences, and improve user experience.',
  },
  {
    title: 'Analytics Cookies',
    body: 'Analytics cookies help us understand how visitors use our website, which pages are visited, and how we can improve the experience.',
  },
  {
    title: 'Functional Cookies',
    body: 'Functional cookies may remember your preferences, cookie choices, or settings that improve your browsing experience.',
  },
  {
    title: 'Managing Cookies',
    body: 'You can manage or disable cookies through your browser settings. Some parts of the website may not work as expected if cookies are disabled.',
  },
  {
    title: 'Updates to This Policy',
    body: 'We may update this Cookie Policy as our website, tools, or services change.',
  },
]

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      intro="This page explains how Hbee Digitals may use cookies and similar technologies."
      sections={sections}
      closing={{ title: "Your choice matters", body: "You can accept or decline cookies using the cookie banner when visiting the website.", href: "/privacy", cta: "View Privacy Policy" }}
    />
  )
}
