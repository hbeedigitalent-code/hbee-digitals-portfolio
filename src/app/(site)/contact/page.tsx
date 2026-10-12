import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { ContactIntro, ContactOtherWays } from '@/components/site/contact/ContactSections'
import styles from '@/components/site/contact/contact.module.css'

/**
 * Contact (/contact). Submits to the hardened POST /api/contact
 * (form_type 'enquiry') — one backend.
 */
export const metadata: Metadata = pageMetadata({
  absoluteTitle: 'Contact Hbee Digitals | Start a Conversation',
  description:
    'Contact Hbee Digitals to discuss your business, current growth constraints and the right next move across brand, systems, creative, commerce and customer experience.',
  path: '/contact',
})

export const dynamic = 'force-dynamic'

export default function ContactPage() {
  // ContactForm sets data-sent on this wrapper after a confirmed send, which hides the
  // Growth Review alternatives (.hideOnSent) around the confirmation.
  return (
    <div className={styles.page} data-contact-page>
      <ContactIntro />
      <ContactOtherWays />
    </div>
  )
}
