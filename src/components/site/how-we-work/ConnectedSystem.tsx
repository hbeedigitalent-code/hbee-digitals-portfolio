import Image from 'next/image'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, MODULE_IMAGE } from '../services/capability-entities'
import { SYSTEM_INTRO } from './how-we-work-content'
import styles from './how-we-work.module.css'

/**
 * CONNECTED SYSTEM — the six capabilities as one system, in the methodology
 * page's own (quieter) treatment: the canonical module renders on one shared
 * line, in reading order. Not the Services hero and not a link list (the
 * linked capability tiles follow in "Capabilities enter the process where
 * needed"). Static, no motion of its own.
 */
const SIZE = 96

export function ConnectedSystem() {
  return (
    <figure className={styles.system}>
      <figcaption className="sr-only">{SYSTEM_INTRO.label}</figcaption>
      <div className={styles.systemFrame}>
        <span aria-hidden="true" className={styles.systemLine} />
        <ol className={styles.systemList}>
          {CAPABILITY_ORDER.map((slug) => {
            const entity = CAPABILITY_ENTITIES[slug]
            return (
              <li key={slug} className={styles.systemItem}>
                <span aria-hidden="true" className={styles.systemNode}>
                  <Image src={MODULE_IMAGE[entity.module]} alt="" width={SIZE} height={SIZE} sizes="96px" className={styles.systemArt} draggable={false} />
                </span>
                <span className={styles.systemName}>{entity.name}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <p className={styles.systemNote}>{SYSTEM_INTRO.note}</p>
    </figure>
  )
}
