import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { ContactIntro, ContactOtherWays } from '@/components/site/contact/ContactSections'
import styles from '@/components/site/contact/contact.module.css'
import { SITE_URL } from '@/lib/blog-utils'

/**
 * Contact (/contact). Submits to the hardened POST /api/contact
 * (form_type 'enquiry') — one backend. Contact is for visitors who already know
 * why they are reaching out; Growth Review is the route for "what should we fix first".
 */
const DESCRIPTION =
  'Contact Hbee Digitals about a project, service, partnership or question. Not sure what to fix first? Start with a Growth Review instead.'

export const metadata: Metadata = pageMetadata({
  absoluteTitle: 'Contact Hbee Digitals | Start a Conversation',
  description: DESCRIPTION,
  path: '/contact',
})

export const dynamic = 'force-dynamic'

// ContactPage + BreadcrumbList. The publisher is a reference to the existing site
// Organization (`@id`) — no second Organization node, no LocalBusiness, no FAQPage.
const contactLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': `${SITE_URL}/contact#webpage`,
  url: `${SITE_URL}/contact`,
  name: 'Contact Hbee Digitals',
  description: DESCRIPTION,
  publisher: { '@id': `${SITE_URL}#organization` },
}
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact` },
  ],
}

export default function ContactPage() {
  // ContactForm sets data-sent on this wrapper after a confirmed send, which hides the
  // Growth Review bridge and the other routes (.hideOnSent) around the confirmation.
  return (
    <div className={styles.page} data-contact-page>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ContactIntro />
      <ContactOtherWays />
    </div>
  )
}
