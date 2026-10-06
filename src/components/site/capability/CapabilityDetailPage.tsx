import { notFound } from 'next/navigation'
import { CAPABILITY_DETAILS, capabilityIdentity } from './capability-content'
import { CapabilityHero } from './CapabilityHero'
import { CapabilityApproach, CapabilityCta, CapabilityOpportunity, CapabilityWork } from './CapabilitySections'
import { CapabilitySystemFit } from './CapabilitySystemFit'

/**
 * The capability-detail template. One structure for all six capabilities;
 * everything specific comes from the capability's content object
 * (capability-content.ts) and its identity in the Services system.
 *
 *   01 Hero · 02 Opportunity · 03 What we do · 04 Real work ·
 *   05 How it fits · 06 Growth Review CTA   (footer from the layout)
 *
 * Server component throughout; client code is limited to the shared
 * SiteNav and SiteReveal triggers.
 */
export function CapabilityDetailPage({ slug }: { slug: string }) {
  const detail = CAPABILITY_DETAILS[slug]
  const identity = capabilityIdentity(slug)
  if (!detail || !identity) notFound()

  const name = identity.capability.name
  return (
    <>
      <CapabilityHero detail={detail} name={name} />
      <CapabilityOpportunity detail={detail} />
      <CapabilityApproach detail={detail} name={name} />
      <CapabilityWork detail={detail} />
      <CapabilitySystemFit detail={detail} name={name} />
      <CapabilityCta detail={detail} />
    </>
  )
}
