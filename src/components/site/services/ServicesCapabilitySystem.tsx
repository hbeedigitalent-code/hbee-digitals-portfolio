import { BarChart3, Lightbulb, Search, Settings, Tag, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { SERVICE_GROUPS, SYSTEM_INTRO, type CapabilityIcon } from './services-content'
import styles from './services.module.css'

/* Same icon set the six-module system uses, so a capability reads as the
   module it belongs to (Brand, Technology, Creative, Discovery, Experience, Growth). */
const ICON_PROPS = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const
const ICONS: Record<CapabilityIcon, ReactNode> = {
  brand: <Tag {...ICON_PROPS} />,
  systems: <Settings {...ICON_PROPS} />,
  creative: <Lightbulb {...ICON_PROPS} />,
  discovery: <Search {...ICON_PROPS} />,
  commerce: <UserRound {...ICON_PROPS} />,
  retention: <BarChart3 {...ICON_PROPS} />,
}

/**
 * 02 — Capability system (Night). The GROUP is the primary structure:
 * Foundation → Activation → Growth, each with its number, name and statement,
 * holding two capabilities joined by one structural connector.
 *
 * ≥1280: intro left (4 cols), the three groups as system columns (8 cols).
 * 1024–1279: intro above, three columns full width.
 * <1024: groups stack in order; capabilities become compact rows (two
 * side by side from 768px).
 *
 * Each entry links to its existing detail page and retains its overview anchor.
 */
export function ServicesCapabilitySystem() {
  return (
    <SiteSection id="capabilities" tone="night" aria-labelledby="services-system-title" className={styles.anchor}>
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>Our capability system</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-system-title" size="h2" className="mt-6">
              {SYSTEM_INTRO.headline[0]} <span className="xl:block">{SYSTEM_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{SYSTEM_INTRO.copy}</p>
            <SiteLinkArrow href="#how-we-use-them" className="mt-4 min-h-[44px]">
              See how they connect
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <ol className={cn(styles.groups, 'col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-8')}>
          {SERVICE_GROUPS.map((group, g) => (
            <SiteReveal as="li" key={group.key} index={g} className={styles.group}>
              <div className={styles.groupHead}>
                <div className={styles.groupLabel}>
                  <span className={styles.groupNumber}>{String(g + 1).padStart(2, '0')}</span>
                  <h3 id={`group-${group.key}`} className={styles.groupName}>
                    {group.name}
                  </h3>
                  {group.key === 'growth' && <span aria-hidden="true" className={styles.groupSignal} />}
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">{group.statement}</p>
              </div>

              <ul className={styles.capList} aria-labelledby={`group-${group.key}`}>
                {group.capabilities.map((cap) => (
                  <li key={cap.slug} id={cap.slug} className={cn(styles.cap, styles.anchor)}>
                    <span aria-hidden="true" className={styles.capIcon}>
                      {ICONS[cap.icon]}
                    </span>
                    <h4 className="font-hb-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-hb-fg">
                      {cap.name}
                    </h4>
                    <p className={cn(styles.capPurpose, 'text-[0.9375rem] leading-relaxed text-hb-fg-body')}>{cap.purpose}</p>
                    <SiteLinkArrow href={`/services/${cap.slug}`} className="col-span-2 mt-2 min-h-[44px] text-[0.875rem]">
                      Explore capability<span className="sr-only">: {cap.name}</span>
                    </SiteLinkArrow>
                  </li>
                ))}
              </ul>
            </SiteReveal>
          ))}
        </ol>
      </SiteGrid>
    </SiteSection>
  )
}
