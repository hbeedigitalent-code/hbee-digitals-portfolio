/**
 * Services / Capabilities narrative — DESIGN-CONTROLLED copy (CMS policy:
 * hybrid, as for the homepage). Real work comes from the CMS via
 * src/lib/site/home-data.ts; nothing here stands in for it.
 *
 * Copy supplied in the Phase 4 brief is used verbatim. Copy marked DRAFT was
 * written for this phase and needs owner sign-off.
 *
 * Capability slugs identify both their detail routes and the retained
 * overview anchors (/services#brand-positioning …).
 */

import { CAPABILITY_ENTITIES } from './capability-entities'

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
  /** Explicit question the page answers; the H1 stays human-led but names the subject. */
  question: 'What does Hbee Digitals help ecommerce brands with?',
  headline: ['Ecommerce growth services', 'for Shopify and online brands.'],
  lede:
    'Hbee Digitals helps ecommerce brands grow through six connected capabilities: brand positioning, website and conversion, digital systems and analytics, creative and UGC, traffic and visibility, and retention. Work starts with a diagnosis of what is limiting growth, so a business invests in the capability that matters first.',
}

/** Section between the capability system and the method: why isolated fixes fail. */
export const CONNECT_INTRO = {
  eyebrow: 'Why capabilities connect',
  headline: 'Why fixing one part of a store often does not move growth.',
  /** Direct answer first, then the explanation. */
  answer:
    'Growth in an ecommerce store depends on several parts working together, so a fix in one place can be cancelled out by a weakness in another.',
  points: [
    'Extra traffic cannot convert if the product page does not explain the offer.',
    'A redesign cannot fix positioning that was never clear.',
    'Lifecycle email cannot retain customers who never understood why the brand was different.',
    'Analytics cannot guide priorities if tracking is incomplete or inconsistent.',
  ],
  close:
    'Hbee diagnoses the connections first, then sequences the capabilities. Product presentation and offer structure, for example, sit inside Website & Conversion but depend on Brand & Positioning.',
}

export const SYMPTOMS_INTRO = {
  eyebrow: 'Start from the problem',
  headline: 'Which capability fits the problem you are seeing?',
  copy:
    'Most merchants recognize a symptom before they can name a service. Each symptom below points to the capability most likely to address it. If several apply, the Growth Review identifies which constraint to address first.',
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
        name: CAPABILITY_ENTITIES['digital-systems'].name,
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
        name: CAPABILITY_ENTITIES['discovery-traffic'].name,
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
        name: CAPABILITY_ENTITIES['commerce-experience'].name,
        purpose: 'Reduce friction between interest and purchase across the customer journey.',
        icon: 'commerce',
      },
      {
        slug: 'retention-growth',
        name: CAPABILITY_ENTITIES['retention-growth'].name,
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
  {
    question: 'Should I fix traffic or conversion first?',
    answer:
      'Fix conversion first when qualified visitors already arrive but leave without buying, because additional traffic would reach the same friction. Prioritize traffic and visibility when the storefront converts the visitors it receives but too few of the right buyers arrive. Hbee uses the store journey and the available data to decide which constraint comes first, and the Growth Review is built to answer exactly that.',
  },
  {
    question: 'How can I tell what is limiting my store’s growth?',
    answer:
      'Compare four things in order: whether the brand and offer are clear, whether visitors move through the storefront to purchase, whether the right buyers are arriving, and whether customers come back. Tracking quality decides how confidently any of these can be judged. The Growth Review applies this diagnosis across positioning, conversion, visibility, retention and measurement.',
  },
  {
    question: 'Where does product and offer work fit?',
    answer:
      'Product presentation, merchandising, bundles, value proposition and pricing communication are a service area inside Website & Conversion, connected to Brand & Positioning. They are not a separate capability because they are delivered through the storefront.',
  },
  {
    question: 'What does an ecommerce growth agency do?',
    answer:
      'An ecommerce growth agency diagnoses what limits a store’s revenue and then improves the parts responsible, such as positioning, the storefront, creative, search and traffic, lifecycle email and measurement. Hbee Digitals works with Shopify and ecommerce brands and recommends a staged combination of capabilities rather than a fixed package.',
  },
]
