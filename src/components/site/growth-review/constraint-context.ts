import { DIAGNOSTIC } from '../home/home-content'

/**
 * /growth-review?constraint=<key> continuity (front end only).
 *
 * The homepage self-check emits one of the DIAGNOSTIC keys. A recognized key
 * resolves to the homepage's own approved symptom wording; anything else
 * (missing, unknown, repeated, oddly cased) resolves to null and the standard
 * page is shown. The raw query value is never rendered, and nothing here is
 * sent to the form, the API or scoring.
 */
export function constraintSymptom(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const match = DIAGNOSTIC.find((d) => d.key === value)
  return match ? match.symptom : null
}
