/**
 * Copy and the 15 checks for the Free 15-Point BFCM Readiness Checklist
 * (/bfcm-readiness-checklist). Single source of truth: the page, the progress
 * model and the downloadable PDF script (scripts/build-bfcm-checklist-pdf.cjs)
 * all read the checks from here, so the three can never drift apart.
 *
 * The checklist is a self-review aid, not an assessment: nothing here is
 * scored, graded or sent anywhere.
 */

export interface ChecklistItem {
  /** "01"–"15". */
  number: string
  title: string
  question: string
}

export interface ChecklistGroup {
  id: string
  name: string
  items: ChecklistItem[]
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    id: 'mobile-speed',
    name: 'Mobile & Speed',
    items: [
      { number: '01', title: 'Mobile load experience', question: 'Does the store load quickly enough on a phone without heavy delays?' },
      { number: '02', title: 'Product discovery', question: 'Can a first-time visitor find the right product without getting lost?' },
      { number: '03', title: 'Tap and navigation usability', question: 'Are menus, buttons, variants and key buying actions easy to use on mobile?' },
    ],
  },
  {
    id: 'product-pages',
    name: 'Product Pages',
    items: [
      { number: '04', title: 'First-screen clarity', question: 'Can a customer quickly understand the product, benefit, price and offer?' },
      { number: '05', title: 'Decision-making details', question: 'Are sizing, variants, materials, specifications or other important details clear?' },
      { number: '06', title: 'Trust proof', question: 'Are reviews, real product images, testimonials or other confidence signals visible?' },
    ],
  },
  {
    id: 'shipping-delivery-trust',
    name: 'Shipping, Delivery & Trust',
    items: [
      { number: '07', title: 'Shipping cost clarity', question: 'Can customers understand shipping costs before reaching the final checkout step?' },
      { number: '08', title: 'Delivery expectations', question: 'Are delivery estimates and holiday/BFCM cutoff dates clear?' },
      { number: '09', title: 'Policies & business trust', question: 'Are returns, contact information and important store policies easy to find?' },
    ],
  },
  {
    id: 'checkout',
    name: 'Checkout',
    items: [
      { number: '10', title: 'Guest checkout', question: 'Can a customer purchase without being forced to create an account?' },
      { number: '11', title: 'Payment options', question: 'Are the payment methods your target customers expect available?' },
      { number: '12', title: 'End-to-end checkout test', question: 'Has the entire checkout journey been tested on mobile, including shipping and final payment steps?' },
    ],
  },
  {
    id: 'offer-recovery-tracking',
    name: 'Offer, Recovery & Tracking',
    items: [
      { number: '13', title: 'One clear BFCM offer', question: 'Is the main promotion easy to understand without competing discounts or confusing messages?' },
      { number: '14', title: 'Abandoned-cart recovery', question: 'Have abandoned-cart emails or recovery messages been tested before traffic increases?' },
      { number: '15', title: 'Conversion tracking', question: 'Are visits, add-to-cart, checkout and purchase events being measured correctly?' },
    ],
  },
]

export const CHECKLIST_ITEMS: ChecklistItem[] = CHECKLIST_GROUPS.flatMap((g) => g.items)
export const CHECKLIST_TOTAL = CHECKLIST_ITEMS.length

export const CHECKLIST_SERVICE = 'Free 15-Point BFCM Readiness Checklist'
export const CHECKLIST_PATH = '/bfcm-readiness-checklist'
export const CHECKLIST_PDF_PATH = '/downloads/Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf'
export const CHECKLIST_PDF_FILENAME = 'Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf'

export const CHECKLIST_FORM_ID = 'get-checklist'
export const CHECKLIST_ITEMS_ID = 'the-checklist'

export const CL_HERO = {
  eyebrow: 'FREE BFCM READINESS CHECKLIST',
  headline: 'Is Your Store Ready for',
  headlineAccent: 'Black Friday Traffic?',
  lede: 'Use this 15-point checklist to catch common conversion problems before more visitors arrive.',
  trust: 'Free. Practical. Built for Shopify and e-commerce stores.',
  cta: 'Get the Free Checklist',
  secondaryCta: 'Get a Free Growth Review',
} as const

export const CL_FORM = {
  title: 'Send me the checklist',
  emailLabel: 'Email',
  emailPlaceholder: 'you@yourstore.com',
  urlLabel: 'Store URL (optional)',
  urlPlaceholder: 'yourstore.com',
  cta: 'Send Me the Checklist',
  busy: 'Sending…',
  note: 'We’ll email you the checklist and a download link. No account needed.',
} as const

export const CL_MSG = {
  emailEmpty: 'Please add your email address.',
  emailInvalid: 'That email address doesn’t look quite right — please check it.',
  website: 'We couldn’t read that store address. Try something like yourstore.com, or leave it blank.',
  turnstileMissing: 'Please complete the security check.',
  turnstile: 'We couldn’t complete the security check. Please try it again.',
  rateLimit: 'We couldn’t take another request just yet. Please wait a few minutes and try again.',
  rejected: 'Please check your answers and try again.',
  server: 'Something went wrong on our side and your request wasn’t sent. Please try again in a moment.',
  offline: 'We couldn’t reach Hbee just now. Check your connection and try again.',
} as const

export const CL_READY = {
  title: 'Your BFCM Readiness Checklist is ready.',
  copy: 'We’ve also emailed you a copy. Check the email address you submitted.',
  download: 'Download Checklist',
  growthReview: 'Get My Free Growth Review',
} as const

export const CL_LIST = {
  eyebrow: 'The checklist',
  title: 'Fifteen checks. Five places a sale can slip.',
  copy: 'Open your store on your phone and work through each check. Tick what you have confirmed. Your ticks stay in this browser only.',
  startedHint: 'Tick a check as you review it.',
  progress: (done: number, total: number) => `${done} of ${total} checks completed`,
  reset: 'Clear all ticks',
  allDone: 'Every check reviewed. If anything felt uncertain, a Growth Review can help you decide what to fix first.',
} as const

export const CL_FINAL = {
  title: 'Not sure which of these is costing your store sales?',
  copy: 'Get a Free Growth Review and we’ll identify the top 3 things we’d fix first — within 24 hours.',
  cta: 'Get My Free Growth Review',
} as const
