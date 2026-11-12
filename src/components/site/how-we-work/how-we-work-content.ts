/**
 * How We Work — DESIGN-CONTROLLED copy (CMS policy: hybrid).
 *
 * Two systems are kept deliberately separate:
 *   PROCESS       Assess → Prioritize → Build → Activate → Optimize   (how Hbee works)
 *   CAPABILITIES  the six approved capabilities, from capability-entities.ts (what may enter)
 *
 * S2.2: the old six "growth conditions" (Clarity … Capacity) are gone from this
 * page; the diagnostic framework is the six capabilities. Stage ids are real
 * anchors that the navigation links to (#assess … #optimize).
 *
 * Client Portal claims are limited to features audited in
 * src/app/client-portal (Phase 13 report): project status/progress/milestones,
 * proposals (approve / request changes), files (upload/download),
 * deliverables, requests, notifications. Messaging is NOT claimed — the
 * messages page is read-only and not in the portal navigation.
 */

export const HOW_HERO = {
  eyebrow: 'We start with the business. Not the service.',
  headline: 'How Hbee Digitals Approaches',
  headlineAccent: 'Ecommerce Growth',
  lede:
    'Hbee diagnoses the business before recommending a service. We identify the primary constraint, prioritize what should happen first, and bring in only the capabilities the problem actually requires.',
}

export const ISOLATED_INTRO = {
  headline: 'Why isolated fixes fail',
  copy:
    'Ecommerce problems are connected. A fix applied to one part of the business rarely holds when another part is the real constraint.',
}

/** Each pairing names a common fix and the connected problem it cannot solve alone. */
export const ISOLATED_EXAMPLES: { fix: string; text: string }[] = [
  { fix: 'More traffic', text: 'does not solve a broken buying journey.' },
  { fix: 'A redesign', text: 'does not solve unclear positioning.' },
  { fix: 'Strong creative', text: 'does not repair a weak offer.' },
  { fix: 'Automations', text: 'do not solve a lack of relevant acquisition.' },
  { fix: 'Analytics', text: 'cannot help if the wrong question is being measured.' },
  { fix: 'Retention', text: 'cannot repair a poor first-purchase experience by itself.' },
]

export const SYSTEM_INTRO = {
  label: 'The six Hbee capabilities, connected as one system',
  note: 'Hbee treats these as one connected system, not six separate services.',
}

export const PROCESS_INTRO = {
  headline: 'From diagnosis to measurable progress.',
  copy: 'Five connected stages. Each builds on the last, and the right capabilities enter where the diagnosis calls for them.',
}

/** `id` is the real anchor for the stage (the navigation links to /how-we-work#<id>). */
export const PROCESS_STAGES: { id: string; name: string; text: string }[] = [
  {
    id: 'assess',
    name: 'Assess',
    text: 'Understand the business, offer, customers, current performance and existing systems, then diagnose the primary constraint and the issues connected to it.',
  },
  {
    id: 'prioritize',
    name: 'Prioritize',
    text: 'Decide what matters first and what can wait, based on business impact, dependencies and the evidence available.',
  },
  {
    id: 'build',
    name: 'Build',
    text: 'Create or improve the systems, assets and experience the priority requires, drawing on the relevant capabilities.',
  },
  {
    id: 'activate',
    name: 'Activate',
    text: 'Put the work into use across the right channels and customer journey, so it meets real customers.',
  },
  {
    id: 'optimize',
    name: 'Optimize',
    text: 'Measure what changed, read it against the evidence, and improve from what the business now needs.',
  },
]

export const CAPABILITIES_INTRO = {
  headline: ['Capabilities enter', 'the process where needed.'],
  copy:
    'You do not need every Hbee capability. The relevant capabilities enter where the diagnosis calls for them, and what does not apply is left out.',
  railNote: 'Each capability joins at the stage the diagnosis calls for. None is a fixed package.',
}

export const WORKING_INTRO = {
  headline: 'Clear priorities.',
  headlineAccent: 'Visible progress.',
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
    'Once an engagement begins, clients use the Hbee Client Portal to follow active work, shared files and deliverables, and next steps in one place.',
}

/** Benefits — each maps to an audited, client-facing portal feature (see header). */
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
    name: 'Stay aligned',
    text: 'Review proposals, send requests, follow their status and get notified when something changes.',
    basis: 'proposals (approve / request-changes), requests (client insert), notifications',
  },
]

/** The real portal sidebar labels (src/app/client-portal/layout.tsx), in order. */
export const PORTAL_NAV = ['Overview', 'Growth Profile', 'Projects', 'Proposals', 'Files', 'Requests', 'Invoices', 'Settings']

export const HOW_QUESTIONS_INTRO = { headline: 'Questions merchants ask' }

/** Rendered as visible HTML (no FAQPage schema). Every answer is supported by the process described on this page. */
export const HOW_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'How does Hbee Digitals work with ecommerce brands?',
    answer:
      'Hbee diagnoses before it prescribes. We assess the business and its customer journey, prioritize what should move first, build or improve the relevant systems and experience, put that work into use, then measure what changed and improve from the evidence.',
  },
  {
    question: 'What happens before Hbee recommends a service?',
    answer:
      'Assessment comes first. Hbee looks at the business, offer, customers, current performance and existing systems to identify the primary constraint. A service is recommended only when it addresses that constraint.',
  },
  {
    question: 'Do I need every Hbee capability?',
    answer:
      'No. The six capabilities are not a package. Each enters the work only where the diagnosis calls for it, and what does not apply is left out.',
  },
  {
    question: 'How does Hbee decide what to fix first?',
    answer:
      'Hbee looks for the primary constraint, the issue holding the rest back. It weighs business impact, dependencies between parts of the system and the evidence available, then sequences the work so earlier steps support later ones.',
  },
]

export const HOW_CTA = {
  eyebrow: 'Ready to find what should move next',
  headline: 'Find what should move next.',
  copy:
    'Start with a Growth Review. Hbee reviews your business and store, then recommends the next step, which may be a conversation, a Growth Profile where applicable, or another path.',
}
