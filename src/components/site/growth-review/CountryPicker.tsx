'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { exactCountry, foldText, searchCountries } from './countries'
import styles from './growth-review.module.css'

/**
 * Searchable country picker — ARIA 1.2 combobox with a listbox popup.
 *
 *   typing filters (accent-insensitive, any word, aliases)
 *   ↓/↑ move the highlight · Home/End jump · Enter selects
 *   Escape closes and restores the previous value
 *   Tab / blur close without changing the value, unless the typed text
 *   exactly names one country (or alias), which is then selected.
 *
 * The value is always a name from the local list, stored as the existing
 * `country` string. On phones the field scrolls to the top of the visible
 * area and the list is sized to the space above the keyboard.
 */
interface CountryPickerProps {
  id: string
  value: string
  onChange: (country: string) => void
  onBlurValidate: () => void
  invalid: boolean
  describedBy?: string
}

function Highlight({ name, query }: { name: string; query: string }) {
  const q = foldText(query)
  if (!q) return <>{name}</>
  // Map the folded match back onto the original characters (folding keeps length per letter here, accents aside).
  const folded = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const at = folded.indexOf(q)
  if (at < 0 || folded.length !== name.length) return <>{name}</>
  return (
    <>
      {name.slice(0, at)}
      <mark className={styles.countryMark}>{name.slice(at, at + q.length)}</mark>
      {name.slice(at + q.length)}
    </>
  )
}

export function CountryPicker({ id, value, onChange, onBlurValidate, invalid, describedBy }: CountryPickerProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [maxHeight, setMaxHeight] = useState<number | null>(null)

  // Keep the visible text in step with the committed value (draft restore, reset).
  useEffect(() => {
    if (!open) setQuery(value)
  }, [value, open])

  const results = useMemo(() => (open ? searchCountries(query === value ? '' : query) : []), [open, query, value])

  useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  // Fit the list into the space between the field and the bottom of the
  // VISUAL viewport — i.e. above an open on-screen keyboard.
  useEffect(() => {
    if (!open) return
    const fit = () => {
      const input = inputRef.current
      if (!input) return
      const vv = window.visualViewport
      const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - input.getBoundingClientRect().bottom - 12
      setMaxHeight(Math.max(176, Math.min(352, bottom)))
    }
    fit()
    window.visualViewport?.addEventListener('resize', fit)
    window.addEventListener('scroll', fit, { passive: true })
    return () => {
      window.visualViewport?.removeEventListener('resize', fit)
      window.removeEventListener('scroll', fit)
    }
  }, [open])

  const commit = (country: string) => {
    onChange(country)
    setQuery(country)
    setOpen(false)
  }

  const close = (restore: boolean) => {
    setOpen(false)
    if (restore) setQuery(value)
  }

  const openList = () => {
    setActive(0)
    setOpen(true)
    // Phones: bring the field to the top so the list has room above the keyboard.
    if (window.matchMedia('(max-width: 639px)').matches) {
      requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }))
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openList()
      if (!results.length) return
      setActive((i) => (e.key === 'ArrowDown' ? Math.min(i + 1, results.length - 1) : Math.max(i - 1, 0)))
    } else if (open && (e.key === 'Home' || e.key === 'End') && results.length) {
      e.preventDefault()
      setActive(e.key === 'Home' ? 0 : results.length - 1)
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault()
        commit(results[active])
      } else if (open) {
        e.preventDefault()
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        close(true)
      }
    }
  }

  const onBlur = () => {
    // A click on an option uses mousedown+preventDefault, so focus never leaves first.
    const exact = exactCountry(query)
    if (exact) {
      if (exact !== value) onChange(exact)
      setQuery(exact)
    } else if (!query.trim()) {
      if (value) onChange('')
    } else {
      setQuery(value)
    }
    setOpen(false)
    onBlurValidate()
  }

  const activeId = open && results[active] ? `${listId}-opt-${active}` : undefined

  return (
    <div className={styles.country}>
      <div className={cn(styles.input, styles.countryField, invalid && styles.inputInvalid)}>
        <Search aria-hidden="true" focusable="false" className={styles.countryIcon} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Search for your country"
          value={query}
          onFocus={(e) => e.currentTarget.select()}
          onClick={() => !open && openList()}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            if (!open) openList()
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={styles.countryInput}
        />
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Countries"
        hidden={!open}
        className={styles.countryList}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {results.map((name, i) => (
          <li
            key={name}
            id={`${listId}-opt-${i}`}
            role="option"
            data-index={i}
            aria-selected={name === value}
            className={cn(styles.countryOption, i === active && styles.countryOptionActive)}
            onMouseDown={(e) => {
              e.preventDefault()
              commit(name)
            }}
            onMouseMove={() => setActive(i)}
          >
            <Highlight name={name} query={query === value ? '' : query} />
            {name === value && <span className="sr-only"> (selected)</span>}
          </li>
        ))}
        {open && results.length === 0 && (
          <li role="presentation" className={styles.countryEmpty}>
            No country matches “{query.trim()}”. Check the spelling or try another name for it.
          </li>
        )}
      </ul>
      <p className="sr-only" aria-live="polite">
        {open ? (results.length ? `${results.length} ${results.length === 1 ? 'country' : 'countries'} available` : 'No matching country') : ''}
      </p>
    </div>
  )
}
