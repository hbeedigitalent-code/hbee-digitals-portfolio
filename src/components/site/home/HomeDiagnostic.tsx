'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { growthReviewHref } from '@/lib/site/routes'
import surface from '../module/hbee-surface.module.css'
import { SiteButton } from '../primitives/SiteButton'
import { CONDITIONS, DIAGNOSTIC, type ConditionKey } from './home-content'

const NAME = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.name])) as Record<ConditionKey, string>
/** Each option shares its number with the matching condition on the rail above (01 Clarity … 06 Capacity). */
const NUM = Object.fromEntries(CONDITIONS.map((c, i) => [c.key, String(i + 1).padStart(2, '0')])) as Record<ConditionKey, string>

/**
 * 09 — Self-diagnostic (client leaf; the surrounding section is server-rendered).
 *
 * A native radio group: keyboard, screen-reader and no-JS friendly. Every
 * option already shows the condition it maps to, so the mapping is readable
 * without interaction; choosing one updates the result panel (aria-live) and
 * points the CTA at /growth-review?constraint=<key>.
 */
export function HomeDiagnostic() {
  const [selected, setSelected] = useState<ConditionKey | null>(null)
  const groupName = useId()
  const choice = DIAGNOSTIC.find((d) => d.key === selected)

  return (
    <div className="grid gap-[var(--hb-grid-gap)] lg:grid-cols-12">
      <fieldset className="lg:col-span-7">
        <legend className="sr-only">Which sounds most like your business?</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DIAGNOSTIC.map((d, i) => {
            const checked = selected === d.key
            return (
              <li key={d.key} data-motion="item" style={{ '--hb-motion-index': i } as React.CSSProperties}>
                <label
                  className={cn(
                    surface.surface, surface.nightOption, surface.interactive, surface.compact,
                    'group flex h-full min-h-[104px] cursor-pointer flex-col justify-between gap-4 px-5 pb-4 pt-6 transition-[border-color,background-color] duration-[var(--hb-dur-fast)]',
                    'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--hb-focus)]',
                    checked
                      ? 'border-[rgba(207,224,255,0.6)] bg-hb-midnight'
                      : 'hover:border-[rgba(207,224,255,0.35)]',
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={d.key}
                    checked={checked}
                    onChange={() => setSelected(d.key)}
                    className="sr-only"
                  />
                  <span className="font-hb-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-hb-fg">{d.symptom}</span>
                  <span className="flex items-center gap-2.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-hb-link">
                    {/* The capsule is the Signal Insert in miniature: it widens on hover and turns orange when chosen. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block h-2 rounded-l-[2px] rounded-r-full transition-[width,background-color] duration-[var(--hb-dur-base)] ease-[var(--hb-ease)] motion-reduce:transition-none',
                        checked ? 'w-7 bg-hb-orange' : 'w-4 bg-hb-structure group-hover:w-6',
                      )}
                    />
                    <span aria-hidden="true" className="tabular-nums text-hb-fg-muted">{NUM[d.key]}</span>
                    {NAME[d.key]}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div
        data-motion="card"
        style={{ '--hb-motion-index': 3 } as React.CSSProperties}
        className={cn(surface.surface, surface.night, 'flex flex-col justify-between px-7 pb-8 pt-10 md:px-9 md:pb-10 lg:col-span-5')}
        aria-live="polite"
      >
        {choice ? (
          <div>
            <p className="text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
              Likely constraint
            </p>
            <p className="mt-3 font-hb-display text-[length:var(--hb-text-h2)] font-bold tracking-[-0.03em] text-hb-fg">
              {NAME[choice.key]}
            </p>
            <p className="mt-3 leading-relaxed text-hb-fg-body">{choice.explanation}</p>
          </div>
        ) : (
          <div>
            <p className="font-hb-display text-[1.375rem] font-semibold tracking-[-0.02em] text-hb-fg">
              Choose the one that sounds most familiar.
            </p>
            <p className="mt-3 leading-relaxed text-hb-fg-body">
              It points to the growth condition most likely to be holding the business back.
            </p>
          </div>
        )}
        <SiteButton href={growthReviewHref(selected ?? undefined)} variant="conversion" size="lg" arrow className="mt-8 self-start">
          Find Your Growth Constraint
        </SiteButton>
      </div>
    </div>
  )
}
