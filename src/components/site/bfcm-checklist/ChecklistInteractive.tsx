'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { trackChecklistEvent } from '@/lib/analytics'
import { CHECKLIST_GROUPS, CHECKLIST_ITEMS_ID, CHECKLIST_TOTAL, CL_LIST } from './checklist-content'
import { CHECKLIST_STORAGE_KEY, progress, readTicks, toggleTick } from './checklist-model'
import { analyticsContext, useChecklistAttribution } from './useChecklistAttribution'
import styles from './bfcm-checklist.module.css'

/**
 * The 15 checks as a real, accessible checklist (native checkboxes). Tick state
 * lives ONLY in this browser (localStorage, best-effort): nothing is sent to a
 * server or a database, and nothing is scored. Ticking for the first time fires
 * bfcm_checklist_started (once per page view, no PII).
 */
export function ChecklistInteractive() {
  const [ticks, setTicks] = useState<string[]>([])
  const attribution = useChecklistAttribution()

  useEffect(() => {
    try {
      setTicks(readTicks(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)))
    } catch {
      /* private mode: ticks simply start empty */
    }
  }, [])

  const save = (next: string[]) => {
    setTicks(next)
    try {
      window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* the ticks still work for this page view */
    }
  }

  const onToggle = (number: string) => {
    trackChecklistEvent('bfcm_checklist_started', analyticsContext(attribution, 'checklist'))
    save(toggleTick(ticks, number))
  }

  const { done, percent } = progress(ticks)

  return (
    <div id={CHECKLIST_ITEMS_ID} className={styles.listWrap}>
      <div className={styles.progress} role="group" aria-label="Checklist progress">
        <p className={styles.progressText} aria-live="polite">
          <strong>{CL_LIST.progress(done, CHECKLIST_TOTAL)}</strong>
          <span className={styles.progressPercent}>{percent}% reviewed</span>
        </p>
        <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={CHECKLIST_TOTAL} aria-valuenow={done} aria-label="Checks completed">
          <span className={styles.barFill} style={{ width: `${percent}%` }} />
        </div>
        {done === 0 ? (
          <p className={styles.hint}>{CL_LIST.startedHint}</p>
        ) : (
          <button type="button" className={styles.reset} onClick={() => save([])}>
            {CL_LIST.reset}
          </button>
        )}
      </div>

      {CHECKLIST_GROUPS.map((group, gi) => (
        <fieldset key={group.id} className={styles.group}>
          <legend className={styles.groupName}>
            <span aria-hidden="true" className={styles.groupNumber}>{gi + 1}</span>
            {group.name}
          </legend>
          <ul className={styles.items}>
            {group.items.map((item) => {
              const checked = ticks.includes(item.number)
              const id = `cl-${item.number}`
              return (
                <li key={item.number} className={cn(styles.item, checked && styles.itemDone)}>
                  <input id={id} type="checkbox" className={styles.box} checked={checked} onChange={() => onToggle(item.number)} />
                  <label htmlFor={id} className={styles.itemLabel}>
                    <span className={styles.itemTitle}>
                      <span aria-hidden="true" className={styles.itemNumber}>{item.number}</span>
                      {item.title}
                    </span>
                    <span className={styles.itemQuestion}>{item.question}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      ))}

      {done === CHECKLIST_TOTAL && <p className={styles.allDone}>{CL_LIST.allDone}</p>}
    </div>
  )
}
