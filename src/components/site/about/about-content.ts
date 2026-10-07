/**
 * About page copy (Phase 15). Positioning and belief statements only — no
 * metrics, people, clients, locations or outcomes are stated here. People
 * come exclusively from the CMS (src/lib/site/about-data.ts).
 *
 * Location facts: Hbee's base is Abuja, Nigeria (the address the live site
 * already publishes). West Africa is the regional identity. No other office
 * or city is named anywhere.
 */

export const ABOUT_HERO = {
  eyebrow: 'About Hbee Digitals',
  headline: ['Built to help', 'businesses move', 'forward'],
  headlineAccent: 'with clarity.',
  lede: 'Hbee Digitals is a digital growth studio helping ambitious businesses understand what should move next, build the right systems and create stronger customer experiences.',
  caption: ['Connected people.', 'Stronger businesses.', 'Real impact.'],
} as const

export type ModuleConcept = 'people' | 'strategy' | 'systems' | 'impact'
export const HERO_MODULES: { key: ModuleConcept; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'systems', label: 'Systems' },
  { key: 'impact', label: 'Impact' },
]

export const WHO_WE_ARE = {
  eyebrow: 'Who we are',
  headline: ['A people-first', 'digital growth studio.'],
  copy: [
    'Hbee Digitals is a team of strategists, designers, builders and growth thinkers. We work with businesses that want to grow with more intention — and we start by understanding the business, not by selling a deliverable.',
    'Then we bring the right kinds of thinking together, so the decisions behind a brand, a customer experience and a growth plan support each other instead of pulling apart.',
  ],
  togetherLabel: 'What we bring together',
  together: [
    { name: 'Strategy', text: 'Clarity on what should move next.' },
    { name: 'Creative thinking', text: 'Ideas that make a business easier to understand.' },
    { name: 'Digital systems', text: 'Foundations that keep working as you grow.' },
    { name: 'Customer experience', text: 'Journeys that make buying and returning easier.' },
    { name: 'Growth execution', text: 'Steady, measured work after launch.' },
  ],
  purpose: {
    label: 'Our purpose',
    headline: ['Real people.', 'Real progress.'],
    text: 'We exist to help ambitious businesses unlock their next chapter through clarity, creativity and technology.',
  },
} as const

export type BeliefIcon = 'people' | 'practical' | 'value' | 'openness' | 'standard'
export const BELIEFS_INTRO = {
  eyebrow: 'What we believe',
  headline: ['The principles', 'that guide us.'],
  copy: 'Our beliefs shape how we work, who we work with and the kind of impact we want to create. They keep us focused on what matters — real people, real businesses and real progress.',
} as const
export const BELIEFS: { key: BeliefIcon; name: string; text: string }[] = [
  { key: 'people', name: 'People first', text: 'Businesses are built by people. We design around the people who run them and the people they serve.' },
  { key: 'practical', name: 'Practical thinking', text: 'Good ideas have to survive real budgets, real teams and real timelines.' },
  { key: 'value', name: 'Long-term value', text: 'We favour work that keeps paying off over wins that fade after launch.' },
  { key: 'openness', name: 'Openness', text: 'Clear priorities, honest conversations and no surprises at any stage.' },
  { key: 'standard', name: 'A higher standard', text: 'Careful craft, clear communication and results we can stand behind.' },
]

export const TEAM_INTRO = {
  eyebrow: 'Our team',
  headline: ['The people behind', 'Hbee Digitals.'],
  copy: 'The people responsible for the strategy, creative work, systems and growth behind every engagement — and the relationships that hold it together.',
} as const

export const THINKING = {
  eyebrow: 'How we think',
  headline: ['Strategy, implementation', 'and growth\u00a0— connected.'],
  copy: 'Growth is rarely produced by isolated tactics. Strong strategy decides what matters. Useful implementation turns it into something customers can feel. Continued learning keeps it growing. We treat the three as one piece of work.',
  link: 'See how we work',
  nodes: [
    { key: 'strategy', name: 'Strategy', text: 'Clarity on what should move next.' },
    { key: 'implementation', name: 'Implementation', text: 'Turning decisions into experiences.' },
    { key: 'growth', name: 'Growth', text: 'Learning from what happens next.' },
  ],
} as const

export type DifferenceIcon = 'connected' | 'commerce' | 'commercial' | 'endToEnd' | 'partnership' | 'clarity'
export const DIFFERENCE_INTRO = {
  eyebrow: 'What makes us different',
  headline: ['A partner for what', 'comes next.'],
  copy: 'Many businesses end up managing a designer, a developer, a marketer and an agency who never speak to each other. We work differently.',
} as const
export const DIFFERENCES: { key: DifferenceIcon; name: string; text: string }[] = [
  { key: 'clarity', name: 'Clarity before activity', text: 'We agree on what should move first before anything gets built.' },
  { key: 'connected', name: 'Strategy and implementation together', text: 'The people shaping the plan stay close to the people delivering it.' },
  { key: 'commerce', name: 'E-commerce understanding', text: 'We think about how people browse, decide, buy and come back.' },
  { key: 'commercial', name: 'Practical commercial thinking', text: 'Every recommendation is weighed against what it will do for the business.' },
  { key: 'endToEnd', name: 'An end-to-end perspective', text: 'Brand, experience, systems and growth are considered as one journey.' },
  { key: 'partnership', name: 'A long-term partnership mindset', text: 'We stay for what comes after launch, not just the launch itself.' },
]

export const REACH = {
  eyebrow: 'Our home and our reach',
  headline: ['West Africa, built for', 'businesses everywhere.'],
  copy: 'Hbee Digitals is based in Abuja, Nigeria, with a perspective shaped by the region and a digital approach designed to work beyond geographical boundaries.',
  points: [
    { name: 'Roots', text: 'West Africa' },
    { name: 'Home', text: 'Abuja, Nigeria' },
    { name: 'Outlook', text: 'Beyond geographical boundaries' },
  ],
  location: { name: 'Abuja, Nigeria', text: 'Our home base, with a perspective built to travel.' },
  card: { headline: ['Global mindset.', 'Local insight.'], text: 'Local understanding and a global standard, so the work is relevant where you are and ready for where you are going.' },
} as const

export const WORK_WITH_INTRO = {
  eyebrow: 'Who we work with',
  headline: ['Built for businesses', 'ready to move forward.'],
  copy: 'We do our best work with people who care about how their business grows — not only how it looks.',
  fit: 'Not sure where you fit? A Growth Review is the simplest place to start.',
} as const
export const WORK_WITH: { name: string; text: string }[] = [
  { name: 'E-commerce brands', text: 'Improving how customers discover, choose, buy and return.' },
  { name: 'Growing digital businesses', text: 'Outgrowing the tools and shortcuts that got them started.' },
  { name: 'Founders and leadership teams', text: 'Looking for a clear view of what should move next.' },
  { name: 'Teams that need stronger systems', text: 'Ready to replace disconnected tools and manual work.' },
  { name: 'Businesses preparing to scale', text: 'Strengthening the customer experience before growth adds pressure.' },
]

export const ABOUT_CTA = {
  eyebrow: 'Let’s build what’s next',
  headline: ['Ready to move forward', 'with clarity?'],
  copy: 'Let’s talk about your goals and explore how Hbee can help your business solve real challenges and create what comes next.',
} as const
