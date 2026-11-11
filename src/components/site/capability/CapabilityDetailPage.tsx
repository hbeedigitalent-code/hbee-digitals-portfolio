import { notFound } from 'next/navigation'
import type { InsightSummary } from '@/lib/site/insights-data'
import type { WorkItem } from '@/lib/site/work-data'
import { CAPABILITY_DETAILS, capabilityIdentity } from './capability-content'
import { CapabilityHero } from './CapabilityHero'
import { CapabilityApproach, CapabilityCta, CapabilityFaq, CapabilityOpportunity, CapabilityWork } from './CapabilitySections'
import { CapabilityConnected, CapabilityQuestions, CapabilityServiceArea, CapabilitySymptomsDiagnose } from './CapabilitySemanticSections'
import { CapabilitySystemFit } from './CapabilitySystemFit'

/**
 * The capability-detail template. One structure for all six capabilities;
 * everything specific comes from the capability's content object
 * (capability-content.ts) and its identity in the Services system.
 *
 * Classic order (capabilities without `semantic` content):
 *   Hero · Opportunity · What we do · Real work / Insights · How it fits ·
 *   FAQ · Growth Review CTA
 *
 * Semantic order (capabilities that provide `semantic`, e.g. Website & Conversion):
 *   Hero (explicit H1 + direct answer) · Symptoms + What we diagnose ·
 *   Why it matters (opportunity) · What we do + process · Service area ·
 *   Questions by intent · Proof (work / insights) · Connected capabilities ·
 *   Growth Review CTA
 *
 * Server component throughout; client code is limited to the shared
 * SiteNav and SiteReveal triggers.
 */
export function CapabilityDetailPage({ slug, work = [], insights = [] }: { slug: string; work?: WorkItem[]; insights?: InsightSummary[] }) {
  const detail = CAPABILITY_DETAILS[slug]
  const identity = capabilityIdentity(slug)
  if (!detail || !identity) notFound()

  const name = identity.capability.name

  if (detail.semantic) {
    return (
      <>
        <CapabilityHero detail={detail} name={name} />
        <CapabilitySymptomsDiagnose detail={detail} />
        <CapabilityOpportunity detail={detail} />
        <CapabilityApproach detail={detail} name={name} />
        <CapabilityServiceArea detail={detail} />
        <CapabilityQuestions detail={detail} />
        <CapabilityWork detail={detail} work={work} insights={insights} />
        <CapabilityConnected detail={detail} />
        <CapabilityCta detail={detail} />
      </>
    )
  }

  return (
    <>
      <CapabilityHero detail={detail} name={name} />
      <CapabilityOpportunity detail={detail} />
      <CapabilityApproach detail={detail} name={name} />
      <CapabilityWork detail={detail} work={work} insights={insights} />
      <CapabilitySystemFit detail={detail} name={name} />
      <CapabilityFaq detail={detail} />
      <CapabilityCta detail={detail} />
    </>
  )
}
