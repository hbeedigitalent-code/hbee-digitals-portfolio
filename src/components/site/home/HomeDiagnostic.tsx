'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { growthReviewHref } from '@/lib/site/routes'
import { SiteButton } from '../primitives/SiteButton'
import { CONDITIONS, DIAGNOSTIC, type ConditionKey } from './home-content'

const NAME = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.name])) as Record<ConditionKey, string>

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
          {DIAGNOSTIC.map((d) => {
            const checked = selected === d.key
            return (
              <li key={d.key}>
                <label
                  className={cn(
                    'flex h-full min-h-[88px] cursor-pointer flex-col justify-between gap-3 rounded-[var(--hb-radius-md)] border p-5 transition-[border-color,background-color] duration-[var(--hb-dur-fast)]',
                    'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--hb-focus)]',
                    checked
                      ? 'border-[rgba(207,224,255,0.6)] bg-hb-midnight'
                      : 'border-hb-border bg-[rgba(13,35,64,0.45)] hover:border-[rgba(207,224,255,0.35)]',
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
                  <span className="font-medium leading-snug text-hb-fg">{d.symptom}</span>
                  <span className="flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-hb-link">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block h-2 w-4 rounded-l-[2px] rounded-r-full transition-colors',
                        checked ? 'bg-hb-orange' : 'bg-hb-structure',
                      )}
                    />
                    {NAME[d.key]}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div
        className="flex flex-col justify-between rounded-[var(--hb-radius-xs)] rounded-br-[var(--hb-radius-sweep)] border border-hb-border bg-hb-deep-navy p-7 md:p-9 lg:col-span-5"
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
