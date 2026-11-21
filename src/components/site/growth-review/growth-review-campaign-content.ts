/**
 * Copy for the Free Shopify Growth Review offer (BFCM conversion sprint).
 *
 * The OFFER copy below is evergreen — it stays useful after Black Friday. The
 * seasonal block lives in bfcm-context.ts so it can be retired on its own.
 */

export const GR_OFFER_HERO = {
  eyebrow: 'FREE SHOPIFY GROWTH REVIEW',
  headline: 'Find What to',
  headlineAccent: 'Fix First',
  lede: 'Within 24 hours, we’ll review your store and send you the top 3 things we’d fix first.',
  trust: 'Free. No account needed. No obligation.',
} as const

export const GR_RECEIVE = {
  eyebrow: 'What you’ll receive',
  title: 'Three things, kept concrete.',
  items: [
    { title: 'Your top 3 priorities', text: 'The biggest issues we believe deserve attention first.' },
    {
      title: 'Why they matter',
      text: 'A plain-language explanation of how each issue could affect the buying experience or conversion.',
    },
    { title: 'What to do next', text: 'A practical next step for each priority.' },
  ],
} as const

export const GR_LOOK = {
  eyebrow: 'What we look at',
  title: 'Six places a shopper can lose confidence.',
  copy: 'We review your store the way a first-time customer meets it.',
  items: ['Mobile experience', 'Product clarity', 'Trust', 'Checkout', 'Delivery', 'Tracking'],
} as const

export const GR_HOW = {
  eyebrow: 'How it works',
  title: 'Three steps. Under a minute from you.',
  steps: [
    { title: 'Share your store', text: 'Add your store URL, your email and your biggest challenge.' },
    { title: 'We review the buying experience', text: 'We look at your store as a customer would.' },
    { title: 'Receive your top 3 priorities within 24 hours', text: 'By email, with why each matters and what to do next.' },
  ],
} as const

export const GR_FINAL = {
  title: 'Not sure what’s costing your store sales?',
  copy: 'Start with a free Growth Review. We’ll identify the top 3 things we’d fix first — within 24 hours.',
  cta: 'Get My Free Growth Review',
} as const

/** The id the page's CTAs scroll to: the hero form. */
export const QUICK_FORM_ID = 'get-growth-review'

export const GR_DEEPER = {
  eyebrow: 'Optional next step',
  title: 'Want a deeper Growth Profile?',
  copy:
    'The free Growth Review above is a quick look at your store. If you’d like a fuller picture, the Growth Profile assessment asks about your business in more depth. It takes a few more minutes, and you don’t need it to receive your Growth Review.',
  privacy:
    'We use your answers to review your business and get back to you. Submitting isn’t an approval or a commitment.',
} as const

/** The confirmation shown after a quick request. */
export const GR_REQUEST_RECEIVED = {
  eyebrow: 'Free Growth Review',
  status: 'Request received',
  title: 'Your Growth Review request is in.',
  body: 'We’ll review your store and send you the top 3 things we’d fix first within 24 hours.',
  stepsTitle: 'What happens now',
  steps: [
    'Check the email address you submitted — we’ve sent a confirmation.',
    'We review your store the way a first-time customer meets it.',
    'Your top 3 priorities arrive by email within 24 hours.',
  ],
  needTitle: 'Do I need to do anything?',
  need: 'No. If you’d like to add something, just reply to the confirmation email. If it doesn’t arrive, check your spam folder.',
  deeperTitle: 'Want a fuller picture?',
  deeper: 'The Growth Profile asks about your business in more depth. It’s optional, and not needed for your review.',
  deeperCta: 'Build Your Full Growth Profile',
} as const
