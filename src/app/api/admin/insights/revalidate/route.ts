import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'private, no-store' }

/** Invalidate every public surface affected by an Insights mutation. */
export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin
  if (request.headers.get('origin') !== requestOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Use a same-origin request.' }, { status: 403, headers })
  }

  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response

  try {
    revalidatePath('/', 'page')
    revalidatePath('/insights', 'page')
    revalidatePath('/insights/[slug]', 'page')
    return NextResponse.json({ revalidated: true }, { headers })
  } catch (error) {
    console.error('[admin-insights] public page revalidation failed', error)
    return NextResponse.json({ error: 'The article was saved, but public pages could not be refreshed.' }, { status: 500, headers })
  }
}
