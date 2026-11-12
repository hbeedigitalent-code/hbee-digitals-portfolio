/**
 * About page copy (S3.1). Positioning and operating principles only — no
 * metrics, clients, awards, certifications or outcomes are stated here. People
 * come exclusively from the CMS (src/lib/site/about-data.ts); nothing about a
 * person is written in this file.
 *
 * Entity wording is fixed across the site: "Hbee Digitals is a digital growth
 * studio for Shopify and ecommerce brands." (No second primary descriptor.)
 *
 * Location: Hbee's base is Abuja, Nigeria (the address the live site already
 * publishes). It is stated once, plainly. No global reach, offices or scale
 * are claimed anywhere.
 */

export const ABOUT_HERO = {
  eyebrow: 'About Hbee Digitals',
  headline: 'Hbee Digitals is a Digital Growth Studio',
  headlineAccent: 'for Shopify and Ecommerce Brands',
  lede: 'Hbee connects the parts of ecommerce growth that are often treated separately: brand and positioning, website and conversion, systems and analytics, creative, traffic and retention. We start by finding what is actually limiting growth.',
  caption: ['Connected people.', 'Connected systems.', 'Connected growth.'],
} as const

export type ModuleConcept = 'people' | 'strategy' | 'systems' | 'impact'
export const HERO_MODULES: { key: ModuleConcept; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'systems', label: 'Systems' },
  { key: 'impact', label: 'Growth' },
]

export const WHY_EXISTS = {
  eyebrow: 'Why Hbee exists',
  headline: ['Growth problems', 'are connected.'],
  copy: [
    'Ecommerce brands often treat visibility, positioning, website experience, creative, systems and retention as separate projects, each with its own supplier and its own fix.',
    'In practice they affect one another. More traffic does not repair a confusing store, and a redesign does not repair unclear positioning. Hbee exists to look at the connected picture first, then work on what matters most.',
  ],
  point: {
    label: 'Our point of view',
    headline: ['Connected growth,', 'not isolated tactics.'],
    text: 'Growth works better when the parts that affect each other are considered together.',
  },
} as const

export const TOGETHER = {
  eyebrow: 'What we bring together',
  headline: ['Six capabilities,', 'one connected system.'],
  copy: 'Hbee brings six capabilities together around a diagnosis of what limits growth. You do not need all six; the relevant ones enter where they are needed.',
  link: 'Explore all services',
} as const

export const METHOD = {
  eyebrow: 'How we work',
  headline: ['Diagnose first.', 'Then build.'],
  copy: 'Hbee works in five connected stages and recommends a service only when it addresses the constraint the assessment finds.',
  link: 'See how Hbee works',
} as const

export const TEAM_INTRO = {
  eyebrow: 'Our team',
  headline: ['The people behind', 'Hbee Digitals.'],
  copy: 'The people responsible for the strategy, creative work, systems and growth behind Hbee engagements, with the roles they hold.',
  base: 'Hbee Digitals is based in Abuja, Nigeria.',
} as const

export const TEAM_EMPTY = {
  title: 'Meet the team.',
  text: 'Our team profiles are being updated. In the meantime, you are welcome to get in touch and talk to the team directly.',
  cta: 'Talk to Our Team',
} as const

export type PrincipleIcon = 'diagnosis' | 'connected' | 'priorities' | 'execution' | 'measurement' | 'honesty'
export const PRINCIPLES_INTRO = {
  eyebrow: 'How we operate',
  headline: ['The principles', 'behind the work.'],
  copy: 'These are working rules, not slogans. They decide what Hbee recommends, in what order, and what it leaves out.',
} as const
export const PRINCIPLES: { key: PrincipleIcon; name: string; text: string }[] = [
  { key: 'diagnosis', name: 'Diagnosis before prescription', text: 'We find the constraint before we recommend a service.' },
  { key: 'connected', name: 'Connected thinking', text: 'Brand, website, systems, creative, traffic and retention affect one another, so we look at them together.' },
  { key: 'priorities', name: 'Clear priorities', text: 'We decide what matters first and what can wait, and say why.' },
  { key: 'execution', name: 'Deliberate execution', text: 'Agreed work is built, reviewed and put into use, not left as a recommendation.' },
  { key: 'measurement', name: 'Measurement', text: 'Where evidence is available, we use it to decide what to improve next.' },
  { key: 'honesty', name: 'Honest recommendations', text: 'If a service does not fit the problem, or now is not the right time, we say so.' },
]

export const WORK_PROOF = {
  eyebrow: 'Our work',
  headline: ['See the work', 'behind the approach.'],
  copy: 'Selected projects, including case studies where they have been published, show how Hbee approaches real ecommerce problems.',
  link: 'View our work',
} as const

export const WORK_WITH_INTRO = {
  eyebrow: 'Who we work with',
  headline: ['Built for brands', 'ready to move forward.'],
  copy: 'We do our best work with people who care about how their business grows, not only how it looks.',
} as const
export const WORK_WITH: { name: string; text: string }[] = [
  { name: 'Shopify and ecommerce brands', text: 'Improving how customers discover, choose, buy and return.' },
  { name: 'Growing digital businesses', text: 'Outgrowing the tools and shortcuts that got them started.' },
  { name: 'Founders and leadership teams', text: 'Looking for a clear view of what should move next.' },
  { name: 'Teams that need stronger systems', text: 'Ready to replace disconnected tools and manual work.' },
]

export const ABOUT_QUESTIONS_INTRO = { eyebrow: 'Questions', headline: 'Questions about Hbee Digitals' } as const
/** Visible HTML (no FAQPage schema). Every answer restates facts that are already on the site. */
export const ABOUT_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'What is Hbee Digitals?',
    answer:
      'Hbee Digitals is a digital growth studio for Shopify and ecommerce brands. It connects brand and positioning, website and conversion, digital systems and analytics, creative and UGC, traffic and visibility, and retention and customer value.',
  },
  {
    question: 'What does Hbee Digitals do?',
    answer:
      'Hbee diagnoses what is limiting an ecommerce brand’s growth, prioritizes what should happen first, then builds and improves the relevant systems, creative, traffic and retention work. Each of the six capabilities has its own page.',
  },
  {
    question: 'Who does Hbee Digitals work with?',
    answer:
      'Shopify and ecommerce brands, growing digital businesses, and founders and leadership teams who want a clear view of what should move next.',
  },
  {
    question: 'How does Hbee Digitals approach ecommerce growth?',
    answer:
      'Diagnose before prescribing. Hbee works through five connected stages: Assess, Prioritize, Build, Activate and Optimize, and brings in only the capabilities the diagnosis requires.',
  },
  {
    question: 'Who is behind Hbee Digitals?',
    answer: 'The team section on this page lists the people behind Hbee Digitals and the roles they hold. Hbee is based in Abuja, Nigeria.',
  },
  {
    question: 'Where can I see Hbee Digitals’ work?',
    answer: 'Selected projects, including case studies where they have been published, are on the Work page.',
  },
]

export const ABOUT_CTA = {
  eyebrow: 'Find what should move next',
  headline: ['Ready to find', 'what to fix first?'],
  copy: 'Start with a Growth Review. Hbee reviews your business and store, then recommends the next step, which may be a conversation, a Growth Profile where applicable, or another path.',
} as const
