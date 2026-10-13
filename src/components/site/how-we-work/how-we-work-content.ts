/**
 * How We Work — DESIGN-CONTROLLED copy (CMS policy: hybrid).
 *
 * Two systems are kept deliberately separate:
 *   PROCESS       Assess → Prioritize → Build → Activate → Optimize   (how Hbee works)
 *   CAPABILITIES  the six approved capabilities, from the Services source (what may enter)
 *
 * Client Portal claims are limited to features audited in
 * src/app/client-portal (Phase 13 report): project status/progress/milestones,
 * proposals (approve / request changes), files (upload/download),
 * deliverables, requests, notifications. Messaging is NOT claimed — the
 * messages page is read-only and not in the portal navigation.
 *
 * Copy supplied in the Phase 13 brief is used verbatim; DRAFT marks copy
 * written for this phase.
 */

export const HOW_HERO = {
  headline: 'We start with the business.',
  headlineAccent: 'Not the service.',
  lede:
    'We look at your business, customers, constraints and opportunities first — then determine what should move next. The right strategy, capabilities and work follow from there.',
}

export const CONDITIONS_INTRO = {
  headline: ['Growth problems rarely', 'exist in only one place.'],
  copy:
    'Real progress comes from looking at the full customer experience and the conditions that influence it. We assess where things stand across six key areas before deciding what to focus on.',
}

export type ConditionIcon = 'clarity' | 'confidence' | 'discovery' | 'decision' | 'value' | 'capacity'

export const GROWTH_CONDITIONS: { key: ConditionIcon; name: string; text: string }[] = [
  { key: 'clarity', name: 'Clarity', text: 'A clearer direction and brand.' },
  { key: 'confidence', name: 'Confidence', text: 'A stronger customer experience.' },
  { key: 'discovery', name: 'Discovery', text: 'More of the right customers.' },
  { key: 'decision', name: 'Decision', text: 'A smoother path to purchase.' },
  { key: 'value', name: 'Value', text: 'Greater value per customer.' },
  { key: 'capacity', name: 'Capacity', text: 'Systems that can scale.' },
]

export const PROCESS_INTRO = {
  headline: 'From insight to impact.',
  copy:
    'A structured, connected process that turns business understanding into measurable progress. Each stage builds on the last, with the right capabilities entering where they’re needed.',
}

export const PROCESS_STAGES: { name: string; text: string }[] = [
  { name: 'Assess', text: 'Understand the business, customer journey and current constraints.' },
  { name: 'Prioritize', text: 'Identify the biggest opportunities and what should move next.' },
  { name: 'Build', text: 'Create the required systems, experiences or assets.' },
  { name: 'Activate', text: 'Put the work in front of the right customers across relevant channels.' },
  { name: 'Optimize', text: 'Measure, learn and strengthen what works over time.' },
]

export const CAPABILITIES_INTRO = {
  headline: ['Capabilities enter', 'the process where needed.'],
  copy:
    'Our six core capabilities can be deployed at different stages based on what your business needs. This ensures the right expertise is applied at the right time — not a one-size-fits-all approach.',
  /** DRAFT */
  railNote: 'Each capability joins at the stage the diagnosis calls for — never as a fixed package.',
}

export const WORKING_INTRO = {
  headline: 'Clear priorities.',
  headlineAccent: 'Visible progress.',
  /** DRAFT, from the brief's supporting idea. */
  copy: 'The work stays structured from the first diagnosis through implementation and ongoing improvement.',
}

export const WORKING_PRINCIPLES: { name: string; text: string }[] = [
  { name: 'Alignment', text: 'We establish the business situation, priorities and intended direction before work begins.' },
  { name: 'Scope', text: 'You understand what is being worked on, why it matters and what the next stage involves.' },
  {
    name: 'Implementation',
    text: 'The agreed work is built, reviewed and moved into use rather than remaining as recommendations alone.',
  },
  { name: 'Collaboration', text: 'Updates, feedback and decisions stay connected to the work.' },
  { name: 'Measurement', text: 'Where evidence is available, we use it to learn what should be improved next.' },
]

export const PORTAL_INTRO = {
  headline: 'Your work stays visible.',
  copy:
    'Once an engagement begins, clients have a dedicated Hbee Client Portal that keeps project information, files and next steps connected in one place.',
}

/** Benefits — each maps to an audited, client-facing portal feature (see header). DRAFT wording. */
export const PORTAL_BENEFITS: { name: string; text: string; basis: string }[] = [
  {
    name: 'Know what’s happening',
    text: 'Follow each project’s status, progress and milestones.',
    basis: 'projects + project detail (status, progress, milestones)',
  },
  {
    name: 'Keep important work together',
    text: 'Upload and download project files, and access deliverables in one place through Files.',
    basis: 'files + deliverables (both inside Files: upload / signed download)',
  },
  {
    name: 'Review what needs attention',
    text: 'Read proposals and approve them or request changes.',
    basis: 'proposals (approve / request-changes routes)',
  },
  {
    name: 'Stay aligned',
    text: 'Send requests, follow their status and get notified when something changes.',
    basis: 'requests (client insert), notifications',
  },
]

/** The real portal sidebar labels (src/app/client-portal/layout.tsx), in order. */
export const PORTAL_NAV = ['Overview', 'Growth Profile', 'Projects', 'Proposals', 'Files', 'Requests', 'Invoices', 'Settings']

export const HOW_CTA = {
  eyebrow: 'Ready to find what should move next',
  headline: 'Find what should move next.',
  copy:
    'Start with a focused Growth Review and get a clearer view of where your business is today, what deserves attention first and which capabilities can help move it forward.',
}
