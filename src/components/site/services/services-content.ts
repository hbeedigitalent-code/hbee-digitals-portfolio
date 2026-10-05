/**
 * Services / Capabilities narrative — DESIGN-CONTROLLED copy (CMS policy:
 * hybrid, as for the homepage). Real work comes from the CMS via
 * src/lib/site/home-data.ts; nothing here stands in for it.
 *
 * Copy supplied in the Phase 4 brief is used verbatim. Copy marked DRAFT was
 * written for this phase and needs owner sign-off.
 *
 * Capability slugs match the anchors the Services mega-menu already targets
 * (/services#brand-positioning …), so the menu lands on the right entry once
 * this page replaces /services at launch.
 */

export type CapabilityIcon = 'brand' | 'systems' | 'creative' | 'discovery' | 'commerce' | 'retention'

export interface ServiceCapability {
  slug: string
  name: string
  purpose: string
  icon: CapabilityIcon
}

export interface ServiceGroup {
  key: 'foundation' | 'activation' | 'growth'
  name: 'Foundation' | 'Activation' | 'Growth'
  statement: string
  capabilities: [ServiceCapability, ServiceCapability]
}

export const SERVICES_HERO = {
  eyebrow: ['Services', 'Capabilities'],
  headline: ['Different capabilities.', 'One growth system.'],
  lede:
    'Brand, technology, creative, customer experience, discovery and growth capabilities that work together — informed by a clear diagnosis and focused on measurable business progress.',
}

export const SYSTEM_INTRO = {
  headline: ['Six capabilities.', 'Engineered for growth.'],
  copy:
    'Each capability plays a distinct role. Together, they form a connected system that helps move a business from clearer foundations to stronger activation and sustainable growth.',
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    key: 'foundation',
    name: 'Foundation',
    statement: 'Set the direction and build the foundations for sustainable growth.',
    capabilities: [
      {
        slug: 'brand-positioning',
        name: 'Brand & Positioning',
        purpose: 'Clarify who the business is for, why it matters and how it should be understood.',
        icon: 'brand',
      },
      {
        slug: 'digital-systems',
        name: 'Digital Systems',
        purpose:
          'Build and improve the technology, data and operational systems that support the customer experience and growth.',
        icon: 'systems',
      },
    ],
  },
  {
    key: 'activation',
    name: 'Activation',
    statement: 'Create demand and turn attention into opportunity.',
    capabilities: [
      {
        slug: 'creative-ugc',
        name: 'Creative & UGC',
        purpose:
          'Create product and brand communication that earns attention, builds belief and helps customers understand the offer.',
        icon: 'creative',
      },
      {
        slug: 'discovery-traffic',
        name: 'Discovery & Traffic',
        purpose: 'Help the right audience find the business through the appropriate discovery and acquisition channels.',
        icon: 'discovery',
      },
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    statement: 'Convert, retain and increase customer value.',
    capabilities: [
      {
        slug: 'commerce-experience',
        name: 'Commerce Experience',
        purpose: 'Reduce friction between interest and purchase across the customer journey.',
        icon: 'commerce',
      },
      {
        slug: 'retention-growth',
        name: 'Retention & Growth',
        purpose: 'Increase customer value, repeat engagement and the efficiency of future growth.',
        icon: 'retention',
      },
    ],
  },
]

export const METHOD_INTRO = {
  headline: ['It starts with a diagnosis.', 'Then the right capabilities.'],
  copy:
    'Every business is different. We diagnose where you are, identify what is holding you back, and connect the capabilities that matter most to the next stage of growth.',
  /** The "not a bundle" statement (owner-approved, Phase 4.1). */
  notBundle: {
    title: 'Not every business needs every capability.',
    text: 'Hbee diagnoses first. Depending on the constraint, the right next step may involve one capability, several working together, or a staged combination.',
  },
}

/**
 * The Services-page expression of the approved five-stage Hbee Growth System.
 * Stage NAMES are the approved ones (same as the homepage and the How We Work
 * menu); the lines are DRAFT and describe each stage through the capabilities
 * lens, carrying the brief's four-stage meaning:
 *   Diagnose → Assess · Design → Prioritize · Activate → Build + Activate · Scale → Optimize
 */
export const METHOD_STAGES: { name: string; text: string }[] = [
  { name: 'Assess', text: 'Diagnose the business, the customer journey and what is currently limiting growth.' },
  { name: 'Prioritize', text: 'Choose the capabilities that matter most now — and leave out what doesn’t.' },
  { name: 'Build', text: 'Create or improve the systems, experiences and creative the plan requires.' },
  { name: 'Activate', text: 'Implement, test and put the selected work in front of customers.' },
  { name: 'Optimize', text: 'Build on what works and strengthen the systems needed for continued growth.' },
]

export const WORK_INTRO = {
  headline: 'Capabilities applied to real business problems.',
  /** DRAFT */
  copy: 'Real projects, shown as they are recorded — the business, the problem and the work involved.',
  empty: 'Project write-ups will appear here once case studies are published.',
}

export const SERVICES_CTA = {
  headline: 'Let’s find the right capabilities for your business.',
  copy:
    'Start with a focused Growth Review and get a clearer view of what deserves attention first — and which capabilities can make the biggest difference.',
}

/**
 * DRAFT answers. Grounded in the existing assessment → review → priorities →
 * plan flow (src/components/growth-readiness/FAQ.tsx). No durations, prices,
 * response times or guaranteed results.
 */
export const SERVICES_FAQ: { question: string; answer: string }[] = [
  {
    question: 'How do you decide which capabilities we need?',
    answer:
      'We start with a diagnosis, not a package. We look at the business, the customer journey and what is currently limiting progress, then recommend the capabilities that address it. That may be one capability, several, or a staged combination that builds over time.',
  },
  {
    question: 'Do we have to use all six capabilities?',
    answer:
      'No. The six capabilities describe Hbee’s complete system, not a mandatory bundle. Most businesses need a focused combination, and some need only one.',
  },
  {
    question: 'Can Hbee work with our existing team or systems?',
    answer:
      'The diagnosis starts with what is already in place — your team, platforms and existing work — and recommendations build on what is working rather than replacing it by default. How we work alongside your team is agreed for each engagement.',
  },
  {
    question: 'What happens after the Growth Review?',
    answer:
      'We review what you share, identify what may be limiting progress and prioritize what deserves attention first. From there we recommend a plan: which capabilities, in what order. Implementation is agreed separately, based on that plan.',
  },
]
