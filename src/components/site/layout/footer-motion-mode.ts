/**
 * How much the shared footer crest and footer entrance move on a given route.
 *
 *   full    homepage: ambient crest drift AND the scroll-linked footer entrance (Phase 1)
 *   calm    marketing / editorial pages (Insights, Services, Work, About, Contact …): the crest drifts at less than half
 *           the speed and the footer simply sits still. These routes may be promoted to `full` in a later phase.
 *   static  legal and utility pages: the crest is drawn but does not move
 *
 * Reduced motion overrides all of these in CSS: the crest is always completely static and every footer layer is in its
 * final position.
 */
export type FooterMotionMode = 'full' | 'calm' | 'static'

const STATIC_PREFIXES = ['/privacy', '/terms', '/cookies', '/unsubscribe', '/growth-review/received', '/client-onboarding']

export function footerMotionMode(pathname: string | null | undefined): FooterMotionMode {
  if (!pathname) return 'calm'
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === '/') return 'full'
  if (STATIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))) return 'static'
  return 'calm'
}
