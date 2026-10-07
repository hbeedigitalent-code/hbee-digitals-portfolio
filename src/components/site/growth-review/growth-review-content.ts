/**
 * Growth Review copy and answer options (Phase 16.4, from the approved Phase
 * 16.3 specification).
 *
 * STORED VALUES ARE A CONTRACT. Every option below pairs a display `label`
 * with the exact `value` the existing endpoint, HGRI scoring and admin review
 * already use. Labels may be friendlier; values never change here.
 */

export interface Option {
  value: string
  label: string
  description?: string
}

export const GR_HERO = {
  eyebrow: 'Growth Review',
  headline: 'Understand what should',
  headlineAccent: 'move next.',
  lede: 'Tell us about your business and where growth feels stuck. We look at the whole picture — how customers find you, buy from you and come back — before recommending anything.',
  cta: 'Start the Growth Review',
  trust: ['Reviewed by the Hbee team', 'No account needed', 'No obligation'],
} as const

export type AreaKey = 'visibility' | 'conversion' | 'retention' | 'authority' | 'scalability'

/** The five Growth Readiness diagnostic areas (not the 5-stage process, not the capabilities). */
export const GR_AREAS: { key: AreaKey; name: string; text: string }[] = [
  { key: 'visibility', name: 'Visibility', text: 'How customers find you' },
  { key: 'conversion', name: 'Conversion', text: 'How visits turn into sales' },
  { key: 'retention', name: 'Retention', text: 'Whether customers come back' },
  { key: 'authority', name: 'Authority', text: 'Why people trust your brand' },
  { key: 'scalability', name: 'Scalability', text: 'Whether the business is ready to grow' },
]

export const GR_LOOK_AT = {
  title: 'What we look at',
  line: 'We look at these together, because they affect each other.',
} as const

export const GR_NEXT = {
  title: 'What happens after you submit',
  steps: [
    { title: 'We confirm we have it.', text: "You'll get an email as soon as your answers arrive." },
    { title: 'We look at your business.', text: 'Someone from the Hbee team reviews your answers alongside your website or store.' },
    { title: 'We work out what matters first.', text: "Where it's useful, we identify the priorities that deserve attention." },
    {
      title: 'We tell you the next step.',
      text: "That might be a Growth Profile, a conversation with the team, or our honest view that now isn't the right time.",
    },
  ],
  closing: "Submitting isn't an approval or a commitment — on either side.",
} as const

export const GR_ASSESSMENT = {
  eyebrow: 'The assessment',
  title: 'Tell us about your business.',
  privacy:
    "We use your answers to review your business and get back to you about this Growth Review. Submitting isn't an approval or a commitment.",
} as const

export const GR_SECTIONS = [
  { id: 'business', name: 'Business', intro: "Let's start with a few details about your business." },
  { id: 'now', name: 'Where you are now', intro: 'Tell us about your current setup.' },
  { id: 'goals', name: 'Goals', intro: 'What matters most over the next three months.' },
  { id: 'challenge', name: 'Challenge', intro: 'In your own words.' },
  { id: 'priority', name: 'Priority', intro: "Let's finish with a few final questions." },
] as const

export const INDUSTRIES: Option[] = [
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Health & Wellness',
  'Home & Living',
  'Electronics',
  'Jewelry',
  'Pet Products',
  'Food & Beverage',
  'Automotive',
  'Digital Products',
  'Other',
].map((v) => ({ value: v, label: v }))

export const BUSINESS_STAGES: Option[] = [
  { value: 'Planning', label: 'Planning to launch', description: 'Getting ready to start selling' },
  { value: 'Recently Launched', label: 'Recently launched', description: 'Within the last 6 months' },
  { value: 'Growing', label: 'Growing', description: 'Building traction and consistency' },
  { value: 'Established', label: 'Established', description: 'A solid track record' },
  { value: 'Scaling', label: 'Scaling up', description: 'Ready to grow further' },
]

/** Stored values keep their en dashes. */
export const STORE_AGES: Option[] = [
  { value: 'Less than 3 months', label: 'Less than 3 months' },
  { value: '3–12 months', label: '3–12 months' },
  { value: '1–3 years', label: '1–3 years' },
  { value: '3+ years', label: '3+ years' },
]

export const CHANNELS: Option[] = [
  { value: 'SEO', label: 'Search (SEO)' },
  { value: 'Paid Ads', label: 'Paid ads' },
  { value: 'Social Media', label: 'Social media' },
  { value: 'Email Marketing', label: 'Email' },
  { value: 'Content Marketing', label: 'Content' },
  { value: 'Referrals', label: 'Referrals & word of mouth' },
  { value: 'Direct Traffic', label: 'They come direct' },
  { value: 'Marketplaces', label: 'Marketplaces' },
]

export const IN_PLACE_CHOICES: Option[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'Partially', label: 'Partly' },
  { value: 'No', label: 'No' },
  { value: 'Planning to', label: 'Planning to' },
]

export type InPlaceField = 'email_capture' | 'email_automations' | 'customer_reviews' | 'upsells_crosssells'
export const IN_PLACE_ROWS: { field: InPlaceField; label: string }[] = [
  { field: 'email_capture', label: 'We collect customer email addresses' },
  { field: 'email_automations', label: 'We send automated emails (e.g. welcome or abandoned-cart)' },
  { field: 'customer_reviews', label: 'We collect customer reviews' },
  { field: 'upsells_crosssells', label: 'We offer upsells, cross-sells or bundles' },
]

export const PUBLISHING: Option[] = ['Weekly', 'Monthly', 'Rarely', 'Never'].map((v) => ({ value: v, label: v }))

export const GOALS: Option[] = [
  { value: 'More Traffic', label: 'More visitors' },
  { value: 'More Sales', label: 'More sales' },
  { value: 'Better Conversion Rates', label: 'A better conversion rate' },
  { value: 'More Repeat Customers', label: 'More repeat customers' },
  { value: 'Higher Average Order Value', label: 'Higher order value' },
  { value: 'Better Visibility', label: 'Being easier to find' },
  { value: 'SEO Performance', label: 'Search performance (SEO)' },
  { value: 'Brand Positioning', label: 'Clearer brand positioning' },
  { value: 'Customer Retention', label: 'Keeping customers longer' },
  { value: 'Operational Efficiency', label: 'Smoother operations' },
]
export const MAX_GOALS = 3

export const SUPPORT_TYPES: Option[] = [
  { value: 'Just exploring', label: "I'm exploring options" },
  { value: 'Looking for guidance', label: 'Guidance on what to do' },
  { value: 'Looking for strategy', label: 'A clear strategy and plan' },
  { value: 'Looking for implementation support', label: 'Hands-on help making changes' },
]

export const TIMELINES: Option[] = [
  { value: 'Immediately', label: 'As soon as possible' },
  { value: '30 days', label: 'Within a month' },
  { value: '60 days', label: 'Within two months' },
  { value: '90 days', label: 'Within three months' },
  { value: 'Just exploring', label: 'No fixed timing yet' },
]

export const CHALLENGE = {
  label: "What's holding growth back right now?",
  helper: 'A few sentences is plenty — the more specific, the more useful our review.',
  example: 'For example: “Plenty of visitors, but very few first orders.”',
  min: 10,
  max: 2000,
  counterFrom: 1600,
} as const

export const CONSENT_TEXT =
  "I agree to Hbee Digitals using the information I've shared to review my business and contact me about this Growth Review."

/** Phase 16.3 §19 — user-facing messages. */
export const MSG = {
  business_name: 'Please add your business name.',
  contact_name: 'Please tell us your name.',
  emailEmpty: 'Please add your email address.',
  emailInvalid: "That email address doesn't look quite right — please check it.",
  websiteEmpty: 'Please add your website or store address.',
  websiteInvalid: "We couldn't read that address. Try something like yourstore.com.",
  country: 'Please choose your country from the list.',
  industry: 'Please choose the closest industry.',
  choose: 'Please choose the option that fits best.',
  channels: 'Please choose at least one way customers find you.',
  inPlace: (row: string) => `Please choose an answer for “${row}”.`,
  confidence: 'Please choose a number from 1 to 10.',
  goalsNone: 'Please choose at least one goal.',
  goalsMax: 'You can choose up to 3 goals — remove one to add another.',
  challengeEmpty: "Please tell us what's holding growth back — even a sentence helps.",
  challengeShort: 'Please add a little more detail — a sentence or two is enough.',
  consent: "Please confirm you're happy for us to use your answers for this review.",
  turnstile: "We couldn't complete the security check. Please try it again.",
  turnstileExpired: 'The security check expired — please complete it again.',
  turnstileMissing: 'Please complete the security check.',
  rateLimit: "We couldn't take another submission just yet. Please wait a few minutes and try again — your answers are saved.",
  server: "Something went wrong on our side and your review wasn't submitted. Your answers are saved — please try again in a moment.",
  offline: "We couldn't reach Hbee just now. Check your connection — your answers are saved.",
  conflict: 'Your answers changed since your last attempt. Please submit again.',
  rejected: 'Some of your answers need another look before we can submit them. Please check each section and try again.',
} as const

export const SUBMIT = {
  idle: 'Submit Growth Review',
  busy: 'Submitting…',
  slow: 'Still sending — please keep this page open.',
  verySlow: "This is taking longer than usual. You can wait, or try again — you won't create a duplicate.",
  retry: 'Try again',
} as const

export const RECEIVED = {
  eyebrow: 'Growth Review',
  status: 'Assessment received',
  title: 'Thank you — we have your answers.',
  body: "We'll review the information you've shared alongside your business itself, and work out the most useful next step.",
  stepsTitle: 'What happens now',
  steps: [
    "You'll get an email confirming we have your answers.",
    'The Hbee team reviews your business.',
    "We'll email you with the next step.",
  ],
  goodToKnowTitle: 'Good to know',
  goodToKnow: "This confirms we've received your assessment. It isn't an approval or a commitment on either side.",
  needTitle: 'Do I need to do anything?',
  need: "No, nothing else is needed for now. If you'd like to add something, reply to the confirmation email.",
  neutralTitle: 'Looking for the Growth Review?',
  neutralBody: 'Start here.',
  /* Direct-visit recovery copy. Never implies anything was submitted. */
  neutralExplain:
    "This page appears after a Growth Review has been submitted. If you haven't started one yet, begin with a few questions about your business — no account needed, no obligation.",
} as const

export const DRAFT_BANNER = {
  title: "Welcome back — we've kept your answers from earlier.",
  continue: 'Continue where I left off',
  startOver: 'Start over',
  note: 'Your answers are saved on this device for 24 hours so you can pick up where you left off.',
} as const
