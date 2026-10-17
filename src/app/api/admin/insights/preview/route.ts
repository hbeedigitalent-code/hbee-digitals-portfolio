import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-api-auth'
import { toInsightDetail } from '@/lib/site/insights-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Authenticated, non-persisting preview. Same sanitizer/heading pipeline as public. */
export async function POST(request: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    if (Number(request.headers.get('content-length')) > 1000000) return NextResponse.json({ error: 'Preview content is too large.' }, { status: 413, headers })
    const raw = await request.text()
    if (raw.length > 1000000) return NextResponse.json({ error: 'Preview content is too large.' }, { status: 413, headers })
    const input = JSON.parse(raw)
    if (!input || typeof input !== 'object' || typeof input.content !== 'string') return NextResponse.json({ error: 'Provide article content.' }, { status: 400, headers })
    const string = (key: string) => typeof input[key] === 'string' ? input[key] : ''
    const detail = toInsightDetail({ id: 'preview', slug: 'preview', title: string('title') || 'Untitled insight', content: input.content,
      excerpt: string('excerpt'), featured_image: string('featured_image'), featured_image_alt: string('featured_image_alt'),
      author: string('author'), tags: input.tags, read_time: string('read_time'), published_at: string('published_at') })
    return NextResponse.json(detail, { headers })
  } catch {
    return NextResponse.json({ error: 'Unable to render this preview.' }, { status: 400, headers })
  }
}
