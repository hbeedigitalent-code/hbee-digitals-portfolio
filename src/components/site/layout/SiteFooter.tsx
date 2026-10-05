import Link from 'next/link'
import { HbeeLogo } from '../brand/HbeeLogo'
import { MODULE_GEOMETRY } from '../module/HbeeModule'
import {
  CONTACT_EMAIL,
  FOOTER_COLUMNS,
  LEGAL_LINKS,
  PRIMARY_CTA,
  type FooterColumn,
  type SiteLink,
} from '../navigation'
import { SiteButton } from '../primitives/SiteButton'

interface SiteFooterProps {
  columns?: FooterColumn[]
  /**
   * Social profiles. Rendered only when supplied — the production footer reads
   * these from footer_settings, and the sitewide JSON-LD currently holds only
   * placeholder domains, so nothing is hardcoded here.
   */
  social?: SiteLink[]
  contactEmail?: string
}

/**
 * Public-site footer — a deliberate Night section. Independent of
 * components/Footer.tsx, which stays in place for the live routes.
 *
 * Content is static config for now; the props are the seam for wiring
 * footer_settings / site_settings in a later phase.
 */
export function SiteFooter({ columns = FOOTER_COLUMNS, social = [], contactEmail = CONTACT_EMAIL }: SiteFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer data-tone="night" className="relative isolate overflow-hidden">
      {/* Level 2 accent: one oversized module sweep, structural and quiet. */}
      <svg
        viewBox={MODULE_GEOMETRY.viewBox}
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute -right-24 -top-10 -z-10 w-[420px] opacity-[0.16] md:-right-10 md:w-[560px]"
      >
        <path d={MODULE_GEOMETRY.shell} fill="none" stroke="var(--hb-structure)" strokeWidth={1.2} />
        <path d={MODULE_GEOMETRY.stem} fill="none" stroke="var(--hb-structure)" strokeWidth={1.2} />
      </svg>

      <div className="hb-container pb-10 pt-[var(--hb-space-section-compact)]">
        <div className="hb-grid gap-y-12">
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <HbeeLogo onDark size={34} />
            <p className="mt-6 max-w-[22rem] text-[0.9375rem] leading-relaxed text-hb-fg-body">
              Digital growth studio. Brand, experience, technology and growth — connected.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4">
              <SiteButton href={PRIMARY_CTA.href} variant="conversion" arrow>
                {PRIMARY_CTA.label}
              </SiteButton>
              <a
                href={`mailto:${contactEmail}`}
                className="text-[0.9375rem] font-medium text-hb-link underline-offset-[6px] hover:underline"
              >
                {contactEmail}
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="col-span-2 md:col-span-2 lg:col-span-2 lg:first-of-type:col-start-7"
            >
              <h2 className="font-hb-body text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
                {column.title}
              </h2>
              <ul className="mt-5 flex flex-col gap-1">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-[36px] items-center text-[0.9375rem] text-hb-fg-body transition-colors hover:text-hb-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-hb-border pt-8 text-[0.8125rem] text-hb-fg-muted md:flex-row md:items-center md:justify-between">
          <p>© {year} Hbee Digitals. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {social.length > 0 && (
              <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Social">
                {social.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-hb-fg">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <nav aria-label="Legal">
              <ul className="flex gap-x-5">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-hb-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
