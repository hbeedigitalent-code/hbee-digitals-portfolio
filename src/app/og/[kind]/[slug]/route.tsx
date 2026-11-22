// src/app/og/[kind]/[slug]/route.tsx
//
// GET /og/insights/{slug} and /og/work/{slug} — the generated 1200 × 630 social-preview card for a published article or an active project
// (work and case-study pages share the same project record). The page's Open Graph and Twitter metadata point here instead of at the raw CMS
// featured image, whatever its ratio or weight.
//
// WHY A CARD AND NOT THE FEATURED IMAGE. Featured images are portrait, square or landscape, and often several megabytes. Link previews
// (WhatsApp, LinkedIn, Facebook, X) want a 1.91:1 image of modest size. The card is exactly 1200 × 630, a small flat-colour PNG (tens of
// KB), carries the article title and the real Hbee lockup, and never stretches or crops an editorial image.
//
// BEHAVIOUR
//   * Only a PUBLISHED article / ACTIVE project gets a card; anything else is a 404 (the same eligibility the pages themselves use).
//   * If the card cannot be rendered (assets or renderer failure) the static Hbee default image is served instead, with a short cache, so a
//     shared link still shows a proper Hbee preview.
//   * The URL carries a content version (?v=…, see social-image.ts), so an edited title yields a new URL and no stale preview is cached.
//   * No secrets, no request data and no user input reach the image: the slug is validated, the title comes from the stored record.

import { ImageResponse } from 'next/og'

import { SITE_URL } from '@/lib/blog-utils'
import { getInsightSeo } from '@/lib/site/insights-data'
import { loadOgAssets, renderTitleCard } from '@/lib/site/og-card'
import { CARD_SLUG_PATTERN, DEFAULT_SOCIAL_IMAGE_PATH, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH, isCardKind } from '@/lib/site/social-image'
import { getWorkSeo } from '@/lib/site/work-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** One day in browsers, a month at the CDN. Safe because the URL is versioned by content. */
const CARD_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'
const SHORT_CACHE = 'public, max-age=300'

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=60' } })

/** The static Hbee default, fetched from the site's own public URL. Used only when a card cannot be rendered. */
async function defaultImageResponse(): Promise<Response> {
  try {
    const upstream = await fetch(`${SITE_URL}${DEFAULT_SOCIAL_IMAGE_PATH}`, { signal: AbortSignal.timeout(4000) })
    if (!upstream.ok) throw new Error(`default image ${upstream.status}`)
    return new Response(await upstream.arrayBuffer(), { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': SHORT_CACHE } })
  } catch (error) {
    console.error('[og] the default image fallback also failed:', error instanceof Error ? error.message : 'unknown')
    return new Response('Social image unavailable', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
}

export async function GET(_request: Request, { params }: { params: { kind: string; slug: string } }) {
  const { kind, slug } = params
  if (!isCardKind(kind) || typeof slug !== 'string' || slug.length > 160 || !CARD_SLUG_PATTERN.test(slug)) return notFound()

  try {
    // Published article / active project only: the same eligibility the pages use. Anything else has no card.
    const title = kind === 'insights' ? (await getInsightSeo(slug))?.ogTitle : (await getWorkSeo(slug))?.title
    if (!title) return notFound()
    const assets = await loadOgAssets()
    return new ImageResponse(renderTitleCard(assets, { kicker: kind === 'insights' ? 'Insights' : 'Work', title }), {
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      fonts: assets.fonts,
      headers: { 'Cache-Control': CARD_CACHE },
    })
  } catch (error) {
    console.error(`[og] card for ${kind}/${slug} could not be rendered:`, error instanceof Error ? error.message : 'unknown')
    return defaultImageResponse()
  }
}
