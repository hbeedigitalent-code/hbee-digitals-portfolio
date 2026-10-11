import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ContactIntro, ContactOtherWays } from '@/components/site/contact/ContactSections'
import styles from '@/components/site/contact/contact.module.css'

/**
 * /rebuild-contact — the new public Contact experience, isolated for owner
 * review (Phase 17). Rebuild equivalent of the future /contact.
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build. The live /contact page is untouched. Submits to the
 * existing hardened POST /api/contact (form_type 'enquiry') — no second backend.
 */
export const metadata: Metadata = {
  title: 'Rebuild contact',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export const dynamic = 'force-dynamic'

export default function RebuildContactPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  // ContactForm sets data-sent on this wrapper after a confirmed send, which hides the
  // Growth Review alternatives (.hideOnSent) around the confirmation.
  return (
    <div className={styles.page} data-contact-page>
      <ContactIntro />
      <ContactOtherWays />
    </div>
  )
}
