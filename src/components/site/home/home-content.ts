/**
 * Homepage narrative — DESIGN-CONTROLLED copy (CMS policy: hybrid).
 *
 * Everything here is the approved Hbee growth philosophy and section
 * architecture, so it lives in code rather than the CMS. Dynamic business
 * content (work, proof, insights) comes from src/lib/site/home-data.ts.
 *
 * Copy marked DRAFT was written for this phase and needs owner sign-off.
 */

export const HERO = {
  eyebrow: ['Brand', 'Experience', 'Technology', 'Creative', 'Discovery', 'Growth'],
  headline: ['Growth works better', 'when everything', 'connects.'],
  lede:
    'Hbee brings together brand, customer experience, technology, creative and growth systems so businesses can move forward with more clarity and confidence.',
}

export const BRIDGE = {
  parts: ['Brand.', 'Experience.', 'Technology.', 'Creative.', 'Discovery.', 'Growth.'],
  lineA: 'Different parts of the business.',
  lineB: 'One connected growth system.',
}

/** DRAFT — symptom pairs for the problem section. */
export const SYMPTOMS: { seen: string; underneath: string }[] = [
  { seen: 'Traffic is rising', underneath: 'but conversion is falling.' },
  { seen: 'The product is strong', underneath: 'but the story isn’t landing.' },
  { seen: 'The ads are working', underneath: 'but buying friction blocks the sale.' },
  { seen: 'Customers buy once', underneath: 'but nothing brings them back.' },
]

export type ConditionKey = 'clarity' | 'confidence' | 'discovery' | 'decision' | 'value' | 'capacity'

/** Approved definitions. */
export const CONDITIONS: { key: ConditionKey; name: string; question: string }[] = [
  { key: 'clarity', name: 'Clarity', question: 'Do people understand what you offer and why it matters?' },
  { key: 'confidence', name: 'Confidence', question: 'Do they trust the business enough to move forward?' },
  { key: 'discovery', name: 'Discovery', question: 'Can the right audience find you?' },
  { key: 'decision', name: 'Decision', question: 'Does the experience help visitors choose and buy?' },
  { key: 'value', name: 'Value', question: 'Are you increasing value after the first transaction?' },
  { key: 'capacity', name: 'Capacity', question: 'Can the business support the growth it is creating?' },
]

/** Approved stages. */
export const STAGES: { name: string; text: string }[] = [
  { name: 'Assess', text: 'Understand the business, customer journey, data and constraints.' },
  { name: 'Prioritize', text: 'Identify the opportunity most likely to create meaningful impact.' },
  { name: 'Build', text: 'Create or improve the systems, experiences and assets required.' },
  { name: 'Activate', text: 'Deploy the work across the appropriate customer touchpoints.' },
  { name: 'Optimize', text: 'Measure, learn and improve.' },
]

export interface Capability {
  name: string
  /** DRAFT — the business purpose, stated before any deliverable. */
  purpose: string
  /** DRAFT — representative deliverables. */
  deliverables: string[]
}

export interface CapabilityGroup {
  name: 'Foundation' | 'Activation' | 'Growth'
  /** DRAFT */
  summary: string
  capabilities: [Capability, Capability]
}

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    name: 'Foundation',
    summary: 'What the business stands on.',
    capabilities: [
      {
        name: 'Brand & Positioning',
        purpose: 'Make it obvious who you are for and why you are the right choice.',
        deliverables: ['Positioning & messaging', 'Brand identity', 'Offer architecture'],
      },
      {
        name: 'Digital Systems',
        purpose: 'Give the business a reliable foundation to operate and grow on.',
        deliverables: ['Websites & platforms', 'Integrations & automation', 'Analytics & tracking'],
      },
    ],
  },
  {
    name: 'Activation',
    summary: 'How the right people find and believe you.',
    capabilities: [
      {
        name: 'Creative & UGC',
        purpose: 'Create the assets that make people stop, understand and believe.',
        deliverables: ['Campaign creative', 'UGC & creator content', 'Product content'],
      },
      {
        name: 'Discovery & Traffic',
        purpose: 'Put the business in front of the people most likely to buy.',
        deliverables: ['Search & SEO', 'Paid media', 'Content distribution'],
      },
    ],
  },
  {
    name: 'Growth',
    summary: 'Where interest becomes lasting value.',
    capabilities: [
      {
        name: 'Commerce Experience',
        purpose: 'Remove the friction between interest and purchase.',
        deliverables: ['Storefront & Shopify UX', 'Product & checkout experience', 'Conversion optimization'],
      },
      {
        name: 'Retention & Growth',
        purpose: 'Turn first purchases into long-term customer value.',
        deliverables: ['Email & lifecycle', 'Loyalty & subscriptions', 'Customer insight'],
      },
    ],
  },
]

/** Approved symptom → condition mapping. Explanations are DRAFT. */
export const DIAGNOSTIC: { key: ConditionKey; symptom: string; explanation: string }[] = [
  {
    key: 'clarity',
    symptom: 'People don’t understand the offer',
    explanation: 'The value isn’t landing fast enough. Positioning and messaging usually come before more traffic.',
  },
  {
    key: 'confidence',
    symptom: 'They understand, but don’t trust enough',
    explanation: 'Interest is there, belief isn’t. Proof, presentation and reassurance carry the weight here.',
  },
  {
    key: 'discovery',
    symptom: 'The right people aren’t finding the business',
    explanation: 'The offer may be right, but it isn’t reaching the audience most likely to buy.',
  },
  {
    key: 'decision',
    symptom: 'Visitors arrive but don’t convert',
    explanation: 'Something between interest and purchase is creating friction or doubt.',
  },
  {
    key: 'value',
    symptom: 'Customers buy once and disappear',
    explanation: 'The first sale works; the relationship after it doesn’t yet.',
  },
  {
    key: 'capacity',
    symptom: 'Growth creates operational strain',
    explanation: 'Demand is outpacing the systems and processes that support it.',
  },
]

/** DRAFT supporting lines; principle names are approved. */
export const PRINCIPLES: { name: string; text: string }[] = [
  {
    name: 'Diagnose before prescribing',
    text: 'We find what is actually limiting growth before recommending what to build.',
  },
  {
    name: 'Connect the customer journey',
    text: 'Brand, experience, traffic and retention are planned as one path, not as separate projects.',
  },
  {
    name: 'Build for measurable progress',
    text: 'Every engagement is tied to outcomes we can track, learn from and improve.',
  },
]

export const FINAL_CTA = {
  headline: 'Find what should move next.',
  copy:
    'The Hbee Growth Review helps us understand where your business is now, what may be limiting progress and what deserves priority.',
}
