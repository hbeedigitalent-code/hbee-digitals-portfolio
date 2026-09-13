// src/lib/projects/project-date.ts
//
// Calendar dates for projects, kept free of timezones.
//
// A project's start and expected completion are CALENDAR DATES — "the 6th of
// September" — not instants. The moment one is put through a Date object it
// stops being a calendar date and becomes a point in time, and a point in time
// renders as a different day either side of UTC. That is how a project starting
// on the 6th comes to display, or store, as the 5th or the 7th.
//
// Two rules keep it honest:
//
//   1. WRITE: a 'YYYY-MM-DD' string from <input type="date"> goes to the
//      database as that exact string. The previous creation route did
//      `new Date(body.start_date).toISOString()`, turning the calendar date
//      into a UTC instant before storing it — the classic source of an
//      off-by-one, and the reason this helper exists.
//
//   2. READ: formatting never goes through `new Date('2026-09-06')`. That
//      parses as UTC midnight, so `toLocaleDateString()` renders the PREVIOUS
//      day for every viewer west of Greenwich. The parts are split and
//      reassembled instead, so the day shown is always the day stored.

/** Exactly what <input type="date"> produces, and what a DATE column stores. */
const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Normalises a value to 'YYYY-MM-DD', or reports that it cannot be.
 *
 * Accepts a bare calendar date, and also the ISO timestamp shape a timestamptz
 * column returns ('2026-09-06T00:00:00+00:00') — for which it takes the DATE
 * PART AS WRITTEN and does no timezone arithmetic, because the calendar date is
 * what the field means.
 *
 * `null`, `undefined` and '' all mean "not set", which is a legitimate state:
 * a timeline that has not been agreed yet must be storable as NULL rather than
 * invented.
 */
export function toCalendarDate(
  value: unknown,
): { ok: true; value: string | null } | { ok: false; reason: string } {
  if (value === null || value === undefined) return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, reason: 'not_a_date' }

  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: null }

  // Take the date part of an ISO timestamp verbatim. No conversion.
  const candidate = trimmed.length > 10 && trimmed[10] === 'T' ? trimmed.slice(0, 10) : trimmed

  const match = CALENDAR_DATE_RE.exec(candidate)
  if (!match) return { ok: false, reason: 'not_a_date' }

  const [, y, m, d] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  if (month < 1 || month > 12) return { ok: false, reason: 'not_a_date' }

  // Real calendar validation, so 2026-02-31 is refused rather than rolled over
  // into March the way Date would silently do.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > daysInMonth) return { ok: false, reason: 'not_a_date' }

  return { ok: true, value: candidate }
}

/**
 * Compares two calendar dates. Lexicographic comparison is exact for
 * zero-padded 'YYYY-MM-DD', so no Date object is involved here either.
 */
export function isOnOrAfter(later: string, earlier: string): boolean {
  return later >= earlier
}

/**
 * Formats a stored calendar date for display WITHOUT a timezone shift.
 *
 * `new Date('2026-09-06').toLocaleDateString()` renders 5 September for anyone
 * behind UTC. This builds the date from its parts in LOCAL time, so the day
 * shown is always the day stored.
 */
export function formatCalendarDate(
  value: unknown,
  fallback = 'Not set',
  locale?: string,
): string {
  const parsed = toCalendarDate(value)
  if (!parsed.ok || !parsed.value) return fallback

  const [y, m, d] = parsed.value.split('-').map(Number)
  // Local midnight of exactly this calendar day — never reinterpreted.
  return new Date(y, m - 1, d).toLocaleDateString(locale)
}

/** The value an <input type="date"> needs, from whatever the database returned. */
export function toDateInputValue(value: unknown): string {
  const parsed = toCalendarDate(value)
  return parsed.ok && parsed.value ? parsed.value : ''
}
