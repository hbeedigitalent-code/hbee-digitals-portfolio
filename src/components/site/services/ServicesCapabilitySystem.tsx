import { CapabilityModuleCard } from '../module/CapabilityModuleCard'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { CAPABILITY_ENTITIES, type CapabilitySlug } from './capability-entities'
import { SERVICE_GROUPS, SYSTEM_INTRO } from './services-content'
import styles from './services.module.css'

/**
 * 02 — Capability system (White). The six capabilities as functional Hbee
 * modules: module identity + capability name + definition + problems + core
 * work + a descriptive link. Grouped Foundation → Activation → Growth, as in
 * the existing system, so the group order and the `/services#<slug>` anchors
 * are unchanged.
 *
 * Every capability fact is HTML text inside a real link target; the 3D module
 * artwork is decoration only.
 */
export function ServicesCapabilitySystem() {
  return (
    <SiteSection id="capabilities" tone="white" aria-labelledby="services-system-title" className={styles.anchor}>
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12">
          <SiteReveal>
            <SiteEyebrow signal>Our capability system</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-system-title" size="h2" className="mt-6 max-w-[40rem]">
              {SYSTEM_INTRO.headline[0]} <span className="block text-hb-blue">{SYSTEM_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[44rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{SYSTEM_INTRO.copy}</p>
          </SiteReveal>
        </div>

        <ol className="col-span-4 grid gap-12 md:col-span-8 lg:col-span-12">
          {SERVICE_GROUPS.map((group, g) => (
            <SiteReveal as="li" key={group.key} index={g} className="grid gap-5">
              <div>
                <div className={styles.groupLabel}>
                  <span className={styles.groupNumber}>{String(g + 1).padStart(2, '0')}</span>
                  <h3 id={`group-${group.key}`} className={styles.groupName}>
                    {group.name}
                  </h3>
                  {group.key === 'growth' && <span aria-hidden="true" className={styles.groupSignal} />}
                </div>
                <p className="mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-hb-fg-body">{group.statement}</p>
              </div>
              <ul aria-labelledby={`group-${group.key}`} className="grid gap-5 xl:grid-cols-2">
                {group.capabilities.map((capability) => (
                  <li key={capability.slug} id={capability.slug} className={styles.anchor}>
                    <CapabilityModuleCard
                      entity={CAPABILITY_ENTITIES[capability.slug as CapabilitySlug]}
                      detailed
                      soft
                      headingLevel="h4"
                      signal={capability.slug === 'retention-growth'}
                      className="h-full"
                    />
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
