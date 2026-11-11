/**
 * SEMANTIC LAYER for capability pages — the search / answer-engine language.
 *
 * Capability pages keep their human-led hero, opportunity, approach and CTA
 * copy (capability-content.ts). A capability opts in to the semantic template
 * by providing this object. Pages without it render exactly as before, so the
 * remaining capabilities can adopt it one at a time.
 *
 * Copy marked DRAFT was written for Phase S1 and needs owner sign-off. It
 * describes how Hbee reviews a storefront; it contains no client statistics,
 * prices, durations or guaranteed outcomes. Relative imports only.
 */

export type QuestionIntent = 'Definition' | 'Problem' | 'Evaluation' | 'Comparison' | 'Commercial' | 'Diagnostic'

export interface SemanticLink {
  label: string
  href: string
}

export interface SemanticQuestion {
  intent: QuestionIntent
  question: string
  /** Direct, self-contained answer first. */
  answer: string
  /** Editorial links that genuinely expand the answer (descriptive anchors). */
  links?: SemanticLink[]
}

export interface ServiceArea {
  /** Anchor id on the page (target of hub symptom links). */
  id: string
  title: string
  /** Direct answer: what this service area is. */
  answer: string
  topics: { name: string; text: string }[]
  /** How it connects to another capability. */
  connection: { text: string; link: SemanticLink }
  links?: SemanticLink[]
}

export interface CapabilitySemantic {
  /** Explicit H1, split for the two-tone hero treatment. */
  h1: { lead: string; accent: string }
  /** schema.org Service.serviceType. */
  serviceType: string
  /** Direct-answer opening: what the capability is and what it solves (2-4 sentences). */
  definition: string
  symptoms: { eyebrow: string; headline: string; items: { name: string; text: string }[] }
  diagnose: { eyebrow: string; headline: string; intro: string; items: { name: string; text: string }[] }
  /** Overrides the homepage deliverables list shown beside "What we do", where that list does not match the capability's ownership. */
  deliverables?: string[]
  serviceArea?: ServiceArea
  questions: { headline: string; intro: string; items: SemanticQuestion[] }
}
