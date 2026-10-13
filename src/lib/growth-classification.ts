/**
 * The one place HGRI classification names are mapped between the application and the database.
 *
 * DISPLAY names are what admins and clients read. DATABASE values are what the live
 * `growth_profiles` and `growth_reviews` check constraints accept. They differ in exactly one
 * band: the lowest tier is shown as "Foundation Stage" and stored as "Foundation".
 *
 * Scoring (hgri-scoring.ts) produces the display names, so anything that writes a classification
 * into one of those columns must pass it through toDatabaseGrowthClassification() first.
 */

export const DISPLAY_CLASSIFICATIONS = ['Foundation Stage', 'Growth Potential', 'Growth Ready', 'Scale Ready'] as const
export type DisplayClassification = (typeof DISPLAY_CLASSIFICATIONS)[number]

export const DATABASE_CLASSIFICATIONS = ['Foundation', 'Growth Potential', 'Growth Ready', 'Scale Ready'] as const
export type DatabaseClassification = (typeof DATABASE_CLASSIFICATIONS)[number]

const DISPLAY_TO_DATABASE: Record<DisplayClassification, DatabaseClassification> = {
  'Foundation Stage': 'Foundation',
  'Growth Potential': 'Growth Potential',
  'Growth Ready': 'Growth Ready',
  'Scale Ready': 'Scale Ready',
}

/**
 * The database value for a classification, or null if it is not one of the four bands.
 * Display names and already-canonical database values are both accepted. An unknown value is
 * never guessed into a band: the caller must refuse it.
 */
export function toDatabaseGrowthClassification(value: unknown): DatabaseClassification | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if ((DATABASE_CLASSIFICATIONS as readonly string[]).includes(v)) return v as DatabaseClassification
  return DISPLAY_TO_DATABASE[v as DisplayClassification] ?? null
}

/**
 * The display name for a stored or displayed classification, or null if it is not one of the
 * four bands. "Foundation" (the stored value) and "Foundation Stage" both read as "Foundation Stage".
 */
export function toDisplayGrowthClassification(value: unknown): DisplayClassification | null {
  const db = toDatabaseGrowthClassification(value)
  if (!db) return null
  return db === 'Foundation' ? 'Foundation Stage' : db
}

/** For rendering: the display name when the value is a known band, otherwise the value unchanged. */
export function displayGrowthClassification<T extends string | null | undefined>(value: T): T | DisplayClassification {
  return toDisplayGrowthClassification(value) ?? value
}

/**
 * The stored values a classification FILTER must match. Assessments are written with the
 * display name at submission ("Foundation Stage") and rewritten to the database value when a
 * review completes ("Foundation"), so the lowest band matches both. An unknown value returns
 * null: the caller must match nothing, never fall back to a band.
 */
export function storedClassificationsForFilter(value: unknown): string[] | null {
  const db = toDatabaseGrowthClassification(value)
  if (!db) return null
  return db === 'Foundation' ? ['Foundation', 'Foundation Stage'] : [db]
}
