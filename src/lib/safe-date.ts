// src/lib/safe-date.ts
//
// A date for display that can never print the literal text "Invalid Date".
//
// `new Date(undefined).toLocaleDateString()` and `new Date('garbage').toLocaleDateString()` both return the string
// "Invalid Date". That is what the admin Growth Profile page showed for "Updated": the detail API does not return an
// updated_at column, so the page formatted `undefined`. These helpers return null (or a dash) for a missing or
// unparseable value instead of inventing a date.

/** The value as a valid Date, or null when it is missing, empty or not a real date. */
export function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}

/** The locale date string (same output as `toLocaleDateString()`), or null when there is no valid date. */
export function formatDateOrNull(value: unknown): string | null {
  const d = toValidDate(value)
  return d ? d.toLocaleDateString() : null
}

/** The locale date string, or "—" when there is no valid date. */
export function formatDateOrDash(value: unknown): string {
  return formatDateOrNull(value) ?? '—'
}
