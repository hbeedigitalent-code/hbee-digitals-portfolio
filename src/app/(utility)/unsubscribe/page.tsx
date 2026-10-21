import type { Metadata } from 'next'
import { UnsubscribeExperience, type UnsubscribeState } from '@/components/site/unsubscribe/UnsubscribeExperience'
import { verifyNewsletterUnsubscribeIdentity } from '@/lib/newsletter-unsubscribe.server'

export const metadata: Metadata = {
  title: 'Manage newsletter subscription',
  description: 'Manage your Hbee Digitals newsletter subscription.',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function single(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined
}

export default function UnsubscribePage({ searchParams }: {
  searchParams?: { email?: string | string[]; signature?: string | string[]; reason?: string | string[] }
}) {
  const email = single(searchParams?.email)
  const signature = single(searchParams?.signature)
  let initialState: UnsubscribeState = 'invalid_link'

  if (email && signature) {
    try {
      initialState = verifyNewsletterUnsubscribeIdentity(email, signature) ? 'confirmation' : 'invalid_link'
    } catch {
      initialState = 'server_failure'
    }
  }

  return <UnsubscribeExperience initialState={initialState} email={email} signature={signature} />
}
