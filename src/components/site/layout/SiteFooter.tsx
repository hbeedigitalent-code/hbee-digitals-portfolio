import Link from 'next/link'
import { HbeeLogo } from '../brand/HbeeLogo'
import { MODULE_GEOMETRY } from '../module/HbeeModule'
import { CONTACT_EMAIL, FOOTER_COLUMNS, LEGAL_LINKS, PRIMARY_CTA, type FooterColumn, type SiteLink } from '../navigation'
import { SiteButton } from '../primitives/SiteButton'
import { SiteChevron } from '../primitives/SiteIcons'
import { FooterWordmark } from './FooterWordmark'
import { NewsletterForm } from './NewsletterForm'
import { FOOTER_DESCRIPTION, NEWSLETTER_DEFAULTS, newsletterCaptureEnabled, type NewsletterSettings } from '@/lib/footer-settings'
import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from 'lucide-react'
import styles from './site-footer.module.css'

interface SiteFooterProps { columns?: FooterColumn[]; social?: SiteLink[]; contactEmail?: string; description?: string; newsletter?: NewsletterSettings }
const SOCIAL_ICONS = { LinkedIn: Linkedin, Instagram, Facebook, TikTok: Music2, YouTube: Youtube, X: Twitter }

/** Navigation stays code-owned; approved public settings arrive from the server loader. */
export function SiteFooter({ columns = FOOTER_COLUMNS, social = [], contactEmail = CONTACT_EMAIL, description = FOOTER_DESCRIPTION, newsletter = NEWSLETTER_DEFAULTS }: SiteFooterProps) {
  const captureEnabled = newsletterCaptureEnabled(newsletter, 'footer')
  function links(column: FooterColumn) {
    return <ul className={styles.links}>{column.links.map(link => <li key={link.href}><Link href={link.href} className={styles.link}>{link.label}</Link></li>)}</ul>
  }
  return <footer data-tone="night" className={styles.footer}>
    <svg viewBox="0 0 1440 24" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={styles.boundary}>
      <path d="M0 12H340L352 4H522L534 12H980L992 20H1140L1152 12H1440" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx="760" cy="12" r="2.5" fill="currentColor" />
    </svg>
    <svg viewBox={MODULE_GEOMETRY.viewBox} aria-hidden="true" focusable="false" className={styles.motif}>
      <path d={MODULE_GEOMETRY.shell} fill="none" stroke="currentColor" strokeWidth={0.7} />
      <path d={MODULE_GEOMETRY.stem} fill="none" stroke="currentColor" strokeWidth={0.7} />
      <circle cx="40.5" cy="27" r="0.8" fill="currentColor" />
    </svg>
    <div className="hb-container">
      <div className={styles.top}>
        <div className={styles.brand}>
          <HbeeLogo onDark />
          <p>{description}</p>
          <SiteButton href={PRIMARY_CTA.href} variant="conversion" arrow>{PRIMARY_CTA.label}</SiteButton>
          <a href={`mailto:${contactEmail}`} className={styles.contact}>{contactEmail}</a>
          {social.length > 0 && <ul className={styles.social} aria-label="Social profiles">{social.map(link => {
            const Icon = SOCIAL_ICONS[link.label as keyof typeof SOCIAL_ICONS]
            return <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`} className={styles.link}>{Icon ? <Icon size={20} aria-hidden="true" /> : link.label}</a></li>
          })}</ul>}
        </div>
        <section className={styles.newsletter} aria-labelledby="footer-newsletter-title" data-newsletter-slot={captureEnabled ? 'active' : 'reserved'}>
          <p className={styles.eyebrow}><span aria-hidden="true" />Stay connected</p>
          <h2 id="footer-newsletter-title">{newsletter.headline === NEWSLETTER_DEFAULTS.headline ? <>Growth thinking,<br />delivered occasionally.</> : newsletter.headline}</h2>
          <p>{newsletter.description}</p>
          {captureEnabled ? <NewsletterForm source="footer" /> : <p className={styles.comingSoon}>Newsletter signup is coming soon.</p>}
        </section>
        <div className={styles.desktopNav}>{columns.map(column => <nav key={column.title} aria-label={`${column.title} in footer`}><h2 className={styles.eyebrow}>{column.title}</h2>{links(column)}</nav>)}</div>
        <div className={styles.mobileNav}>{columns.map(column => <details key={column.title}><summary>{column.title}<SiteChevron size={16} /></summary>{links(column)}</details>)}</div>
      </div>
      <FooterWordmark />
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Hbee Digitals. All rights reserved.</p>
        <nav aria-label="Legal"><ul>{LEGAL_LINKS.map(link => <li key={link.href}><Link href={link.href} className={styles.link}>{link.label}</Link></li>)}</ul></nav>
      </div>
    </div>
  </footer>
}
