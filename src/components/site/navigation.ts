/**
 * Public-site navigation, owned by the rebuild.
 *
 * Targets are the owner-approved FUTURE URLs. /work, /how-we-work, /insights
 * and /growth-review do not exist yet; they are built in later phases, and the
 * redirects from /portfolio, /process and /blog are added only at launch. Until
 * then these links 404 in the local preview — that is expected.
 *
 * Client Portal points at the existing, unchanged /client-login.
 */

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
]

export const UTILITY_NAV: SiteLink = { label: 'Client Portal', href: '/client-login' }

export const PRIMARY_CTA: SiteLink = { label: 'Start Growth Review', href: '/growth-review' }

/** Approved capability architecture. Slugs/targets are decided in the capability phase. */
export const CAPABILITIES: string[] = [
  'Brand & Positioning',
  'Commerce Experience',
  'Creative & UGC',
  'Digital Systems',
  'Discovery & Traffic',
  'Retention & Growth',
]

export interface FooterColumn {
  title: string
  links: SiteLink[]
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  { title: 'Explore', links: PRIMARY_NAV },
  {
    title: 'Capabilities',
    links: CAPABILITIES.map((label) => ({ label, href: '/services' })),
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
