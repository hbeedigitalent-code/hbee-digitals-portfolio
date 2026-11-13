import Link from 'next/link'
import { BarChart3, LayoutGrid, MessagesSquare, UserRound } from 'lucide-react'
import { configuredReplyTo } from '@/lib/emails/layout'
import { HbeeModuleStandalone } from '../module/HbeeModule'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteLede } from '../primitives/SiteTypography'
import { CAPABILITIES, PRIMARY_CTA, UTILITY_NAV } from '../navigation'
import { ContactForm } from './ContactForm'
import homeStyles from '../home/home.module.css'
import gr from '../growth-review/growth-review.module.css'
import styles from './contact.module.css'

/* ── 01 — Context (left) + form (right), one natural sequence on phones ── */

export function ContactIntro() {
  // Shown in the failure message only when a support address is really configured (RESEND_REPLY_TO).
  const support = configuredReplyTo()?.address ?? null

  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="contact-title" className="overflow-clip">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>
      <SiteGrid className={`gap-y-10 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] ${styles.layout}`}>
        <div className={`col-span-4 md:col-span-8 lg:col-span-5 ${styles.context}`}>
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            Contact
          </p>
          <h1 id="contact-title" className={`mt-6 font-hb-display font-bold text-hb-fg ${styles.title}`}>
            Contact <span className="text-hb-blue">Hbee Digitals</span>
          </h1>
          <SiteLede className="mt-6 max-w-[32rem]">
            Already know what you want to talk about? Tell us about the project, service, partnership or question and
            we’ll take it from there.
          </SiteLede>

          {/* The ONE Growth Review bridge on this page. */}
          <div className={`${styles.altPath} ${styles.hideOnSent}`}>
            <BarChart3 aria-hidden="true" className={styles.altIcon} />
            <div>
              <p className={styles.altTitle}>Not sure what needs fixing?</p>
              <p className={styles.altText}>Start with a Growth Review. It helps identify what to fix first.</p>
              <SiteLinkArrow href={PRIMARY_CTA.href} className={`${styles.altLink} min-h-[44px]`}>
                Start a Growth Review
              </SiteLinkArrow>
            </div>
          </div>
        </div>

        <div className={`col-span-4 md:col-span-8 lg:col-span-7 ${styles.formCol}`}>
          {/* Restrained module presence — desktop only, decorative. */}
          <span aria-hidden="true" className={styles.moduleLine} />
          <div aria-hidden="true" className={styles.module}>
            <HbeeModuleStandalone icon={<MessagesSquare strokeWidth={1.75} width="100%" height="100%" />} label="Conversation" sweep="br" signal width={70} />
          </div>
          <div className={`${gr.card} ${styles.formCard}`}>
            <ContactForm supportEmail={support} />
          </div>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 — Other routes (White): the service a visitor already has in mind, and the Client Portal.
   Hidden after a successful send. The Growth Review bridge lives only beside the hero. ── */

export function ContactOtherWays() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="contact-ways-title" className={styles.hideOnSent}>
      <SiteDisplayHeading as="h2" size="h3" id="contact-ways-title">
        Other ways in
      </SiteDisplayHeading>
      <div className={styles.ways}>
        <div className={styles.way}>
          <LayoutGrid aria-hidden="true" className={styles.wayIcon} />
          <div>
            <h3 className={styles.wayTitle}>Already know the service?</h3>
            <p className={styles.wayText}>Read about the capability you have in mind before you get in touch.</p>
            <ul className={styles.serviceLinks}>
              {CAPABILITIES.map((capability) => (
                <li key={capability.href}>
                  <Link href={capability.href} className={styles.serviceLink}>
                    {capability.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.way}>
          <UserRound aria-hidden="true" className={styles.wayIcon} />
          <div>
            <h3 className={styles.wayTitle}>Already a client?</h3>
            <p className={styles.wayText}>Continue your project or conversation through your Client Portal.</p>
            <SiteLinkArrow href={UTILITY_NAV.href} className="mt-1 min-h-[44px]">
              Go to Client Portal
            </SiteLinkArrow>
          </div>
        </div>
      </div>
    </SiteSection>
  )
}
