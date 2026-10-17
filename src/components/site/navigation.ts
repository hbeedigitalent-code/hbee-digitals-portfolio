/**
 * Public-site navigation.
 *
 * Final public routes: /services, /work, /how-we-work, /insights, /about,
 * /contact, with /growth-review as the primary call to action. The legacy
 * /portfolio, /blog, /process, /growth-readiness and /assessment routes
 * redirect to these (next.config.js).
 *
 * Client Portal points at the existing /client-login, which hands off to
 * /client-portal.
 */

import { SERVICE_GROUPS } from './services/services-content'

export interface SiteLink {
  label: string
  href: string
}

export const PRIMARY_NAV: SiteLink[] = [
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'How We Work', href: '/how-we-work' },
  { label: 'Insights', href: '/insights' },
  { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
]

export const UTILITY_NAV: SiteLink = { label: 'Client Portal', href: '/client-login' }

export const PRIMARY_CTA: SiteLink = { label: 'Start Growth Review', href: '/growth-review' }

/* ── Mega-menus ──────────────────────────────────────────────────
   ONE navigation system, DIFFERENT content depths. Every primary item opens
   the same full-width panel; what goes inside — and therefore the panel's
   height — is set by this data, never by a fixed height.

   Shaped like the data a CMS loader would return, so Work and Insight
   categories (and later a real featured project/article) can be supplied
   dynamically without touching SiteDesktopNav / SiteNav. Capability entries
   use the existing detail routes; stage entries target overview anchors. */

export interface NavMenuLink extends SiteLink {
  description?: string
}

export interface NavMenuColumn {
  title?: string
  /**
   * stack  name + description, one per row        (Services)
   * grid   names only, two per row                (Work, Insight topics)
   * steps  numbered sequence across the panel     (How We Work)
   * list   names only, one per row                (About, Latest)
   */
  layout: 'stack' | 'grid' | 'steps' | 'list'
  /** Relative width inside the panel's primary area (default 1). */
  span?: number
  /** grid only: links per row (default 2). */
  perRow?: 2 | 3
  links: NavMenuLink[]
}

export interface NavMenuAside {
  title?: string
  text: string
  cta?: SiteLink & { variant: 'conversion' | 'secondary' }
  /**
   * branded  Mist plane: stem + Connection Gap, one orange Signal, Sweep (Services only)
   * node     quiet block marked with a single structural Node (Work)
   * quiet    hairline-separated editorial note
   */
  emphasis: 'branded' | 'node' | 'quiet'
}

export interface NavMenu {
  /** Content depth — sets vertical rhythm only; height stays content-driven. */
  depth: 'deep' | 'medium' | 'compact'
  columns: NavMenuColumn[]
  /** Section overview link, shown beneath the columns. */
  overview?: SiteLink
  aside?: NavMenuAside
  /**
   * Columns of the shared 12-column grid given to the primary area and the
   * aside (default 8 / 4). Short menus use a narrower primary area so content
   * doesn't leave a wide empty middle.
   */
  split?: { primary: number; aside: number }
}

export const NAV_MENUS: Record<string, NavMenu> = {
  '/services': {
    depth: 'deep',
    columns: [
      {
        title: 'Foundation',
        layout: 'stack',
        links: [
          { label: 'Brand & Positioning', href: '/services/brand-positioning', description: 'Who you are for, and why you.' },
          { label: 'Digital Systems', href: '/services/digital-systems', description: 'The platform the business runs on.' },
        ],
      },
      {
        title: 'Activation',
        layout: 'stack',
        links: [
          { label: 'Creative & UGC', href: '/services/creative-ugc', description: 'Assets that earn attention and belief.' },
          { label: 'Discovery & Traffic', href: '/services/discovery-traffic', description: 'Reach the people most likely to buy.' },
        ],
      },
      {
        title: 'Growth',
        layout: 'stack',
        links: [
          { label: 'Commerce Experience', href: '/services/commerce-experience', description: 'Less friction between interest and purchase.' },
          { label: 'Retention & Growth', href: '/services/retention-growth', description: 'Value that lasts past the first order.' },
        ],
      },
    ],
    overview: { label: 'All services', href: '/services' },
    aside: {
      emphasis: 'branded',
      title: 'Not sure what you need?',
      text: 'Most growth problems span more than one capability. The Growth Review helps identify which one deserves attention first.',
      cta: { ...PRIMARY_CTA, variant: 'conversion' },
    },
  },
  '/work': {
    depth: 'medium',
    columns: [
      {
        title: 'Browse work',
        layout: 'grid',
        perRow: 3,
        links: [
          { label: 'Ecommerce', href: '/work?category=ecommerce' },
          { label: 'Apparel', href: '/work?category=apparel' },
          { label: 'Beauty', href: '/work?category=beauty' },
          { label: 'Food & Beverage', href: '/work?category=food-beverage' },
          { label: 'Technology', href: '/work?category=technology' },
          { label: 'Concepts & Explorations', href: '/work?type=concept' },
        ],
      },
    ],
    overview: { label: 'All work', href: '/work' },
    aside: {
      emphasis: 'node',
      title: 'Selected work',
      text: 'Explore how Hbee approaches real business problems, from the first constraint to measurable progress.',
    },
  },
  '/how-we-work': {
    depth: 'compact',
    columns: [
      {
        title: 'How Hbee works',
        layout: 'steps',
        links: [
          { label: 'Assess', href: '/how-we-work#assess', description: 'Understand the business and current constraints.' },
          { label: 'Prioritize', href: '/how-we-work#prioritize', description: 'Identify what deserves attention first.' },
          { label: 'Build', href: '/how-we-work#build', description: 'Create the required systems, experiences or assets.' },
          { label: 'Activate', href: '/how-we-work#activate', description: 'Put the work into motion.' },
          { label: 'Optimize', href: '/how-we-work#optimize', description: 'Measure, learn and improve.' },
        ],
      },
    ],
    overview: { label: 'Explore How We Work', href: '/how-we-work' },
    aside: { emphasis: 'quiet', text: 'We start with the business, not the service.' },
  },
  '/insights': {
    depth: 'medium',
    columns: [
      {
        title: 'Latest',
        layout: 'list',
        links: [{ label: 'Latest insights', href: '/insights' }],
      },
      {
        title: 'Topics',
        layout: 'grid',
        span: 2,
        links: [
          { label: 'Brand & Positioning', href: '/insights?category=brand-positioning' },
          { label: 'Commerce Experience', href: '/insights?category=commerce-experience' },
          { label: 'Creative & UGC', href: '/insights?category=creative-ugc' },
          { label: 'Discovery', href: '/insights?category=discovery' },
          { label: 'Digital Systems', href: '/insights?category=digital-systems' },
          { label: 'Growth Operations', href: '/insights?category=growth-operations' },
        ],
      },
    ],
    aside: { emphasis: 'quiet', text: 'Ideas for building better digital businesses.' },
  },
  '/about': {
    depth: 'compact',
    columns: [
      {
        title: 'About Hbee',
        layout: 'list',
        links: [
          { label: 'About Hbee', href: '/about' },
          { label: 'Our approach', href: '/about#approach' },
          { label: 'Contact', href: '/contact' },
        ],
      },
    ],
    aside: {
      emphasis: 'quiet',
      text: 'Digital growth works better when brand, experience, technology, creative and growth systems connect.',
      cta: { label: 'Talk to Hbee', href: '/contact', variant: 'secondary' },
    },
    split: { primary: 4, aside: 6 },
  },
}

/** Footer links follow the approved six-capability system and its group order. */
export const CAPABILITIES: SiteLink[] = SERVICE_GROUPS.flatMap((group) =>
  group.capabilities.map((capability) => ({ label: capability.name, href: `/services/${capability.slug}` })),
)

export interface FooterColumn {
  title: string
  links: SiteLink[]
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  // Contact lives under "Work with us" in the footer; the header keeps it in PRIMARY_NAV.
  { title: 'Explore', links: PRIMARY_NAV.filter((link) => link.href !== '/contact') },
  {
    title: 'Capabilities',
    links: CAPABILITIES,
  },
  {
    title: 'Work with us',
    links: [PRIMARY_CTA, { label: 'Contact', href: '/contact' }, UTILITY_NAV],
  },
]

export const LEGAL_LINKS: SiteLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
]

/** Existing public contact address (as published in the site's Organization JSON-LD). */
export const CONTACT_EMAIL = 'contact@hbeedigitals.com'
