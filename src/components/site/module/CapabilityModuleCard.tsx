import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { SiteArrow } from '../primitives/SiteIcons'
import { CAPABILITY_ENTITIES, MODULE_IMAGE, type CapabilityEntity } from '../services/capability-entities'
import surface from './hbee-surface.module.css'
import styles from './capability-module.module.css'

/**
 * CAPABILITY MODULE — a Hbee module that is also a navigation entity.
 *
 * Every piece of meaning is real HTML: the module identity ("Experience"),
 * the capability name ("Website & Conversion"), the definition, the route and
 * the adjacent capabilities. The canonical 3D module image is decoration
 * (alt=""), so nothing is lost if it fails to load or a crawler ignores it.
 *
 * States
 *   default   neutral surface, a descriptive link stretched over the card
 *   active    the page's own capability: Royal Blue, dominant, not a link
 *   related   adjacent to the active capability: Mist, linked
 *   muted     present but receded
 *
 * Hover / focus extend the Open Channel (surface.interactive) and nudge the
 * artwork; reduced motion removes the nudge.
 */

export type CapabilityModuleState = 'default' | 'active' | 'related' | 'muted'

interface CapabilityModuleCardProps {
  entity: CapabilityEntity
  state?: CapabilityModuleState
  /** Show example problems, core work and adjacent capabilities (hub). */
  detailed?: boolean
  /** Heading level for the capability name. */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** One line explaining why this module is adjacent (capability pages). */
  relation?: string
  /** Mark the single Signal Insert on a composition. */
  signal?: boolean
  /** Mist surface instead of white, for cards sitting on a White section. */
  soft?: boolean
  /** Give the card its capability slug as an anchor id (hub only). */
  anchorId?: boolean
  className?: string
}

export function CapabilityModuleCard({
  entity,
  state = 'default',
  detailed = false,
  headingLevel = 'h3',
  relation,
  signal = false,
  soft = false,
  anchorId = false,
  className,
}: CapabilityModuleCardProps) {
  const Heading = headingLevel
  const active = state === 'active'
  const adjacent = detailed ? entity.adjacent.map((slug) => CAPABILITY_ENTITIES[slug]) : []

  return (
    <article
      id={anchorId ? entity.slug : undefined}
      data-module={entity.module}
      data-state={state}
      className={cn(
        surface.surface,
        surface.interactive,
        active ? surface.blue : state === 'related' || soft ? surface.soft : surface.base,
        styles.card,
        active && styles.active,
        state === 'muted' && styles.muted,
        className,
      )}
    >
      <div aria-hidden="true" className={styles.media}>
        <Image src={MODULE_IMAGE[entity.module]} alt="" width={320} height={320} sizes="(min-width: 1024px) 120px, 88px" className={styles.image} />
      </div>

      <div className={styles.body}>
        <p className={styles.moduleTag}>
          {signal && <span aria-hidden="true" className={surface.signal} />}
          <span className="sr-only">Hbee module: </span>
          {entity.module}
        </p>
        <Heading className={styles.name}>{entity.name}</Heading>
        <p className={styles.definition}>{entity.definition}</p>

        {detailed && (
          <div className={styles.facts}>
            <div>
              <h4 className={styles.factTitle}>Problems it addresses</h4>
              <ul className={styles.factList}>
                {entity.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={styles.factTitle}>Core work</h4>
              <ul className={styles.factList}>
                {entity.coreWork.map((work) => (
                  <li key={work}>{work}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {relation && <p className={styles.relation}>{relation}</p>}

        {adjacent.length > 0 && (
          <p className={styles.adjacent}>
            <span className={styles.adjacentLabel}>Connects with</span>{' '}
            {adjacent.map((a, i) => (
              <span key={a.slug}>
                <Link href={a.href} className={styles.adjacentLink}>
                  {a.name}
                </Link>
                {i < adjacent.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        )}

        {active ? (
          <p className={styles.here}>You are viewing this capability</p>
        ) : (
          <Link href={entity.href} className={cn(styles.cta, styles.stretch)}>
            <span>{entity.linkLabel}</span>
            <SiteArrow size={16} />
          </Link>
        )}
      </div>
    </article>
  )
}
