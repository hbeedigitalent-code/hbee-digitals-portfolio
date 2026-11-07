/**
 * Reading progress for one article, as a pure function of layout measurements
 * (all in CSS px, document coordinates).
 *
 *   start (0%)   the article's top edge sits just under the sticky header
 *   end (100%)   the article's bottom edge reaches the bottom of the viewport
 *
 * Only the article element defines the boundary, so the hero above it and the
 * Related Insights / CTA / footer below it never move the percentage.
 * Returns a value clamped to 0–1.
 */
export interface ReadingProgressInput {
  scrollY: number
  viewportHeight: number
  /** Height of the sticky header the article scrolls under. */
  headerHeight: number
  /** Article top edge in document coordinates. */
  articleTop: number
  articleHeight: number
}

export function readingProgress({ scrollY, viewportHeight, headerHeight, articleTop, articleHeight }: ReadingProgressInput): number {
  const values = [scrollY, viewportHeight, headerHeight, articleTop, articleHeight]
  if (values.some((value) => !Number.isFinite(value)) || articleHeight <= 0) return 0
  const startScroll = articleTop - headerHeight
  const endScroll = articleTop + articleHeight - viewportHeight
  const span = endScroll - startScroll
  // An article that fits entirely in view has no scroll distance to measure:
  // it counts as read once its top has reached the header.
  if (span <= 0) return scrollY >= startScroll ? 1 : 0
  return Math.min(1, Math.max(0, (scrollY - startScroll) / span))
}
