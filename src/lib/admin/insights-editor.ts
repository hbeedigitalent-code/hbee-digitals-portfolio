import type { SupabaseClient } from '@supabase/supabase-js'

/** All list/editor transitions use this existing-field write path. No scheduler. */
export async function writeInsightPost(client: Pick<SupabaseClient, 'from'>, id: string | undefined, fields: Record<string, unknown>, status: string, now = new Date().toISOString()) {
  if (!['draft', 'published'].includes(status)) throw new Error('Choose draft or published.')
  // Ordinary saves cannot reset publication history, even from a stale editor.
  const { published_at: ignoredPublicationDate, ...editable } = fields
  void ignoredPublicationDate
  const payload = { ...editable, status, updated_at: now }
  if (!id) {
    const result = await client.from('blog_posts').insert({ ...payload, published_at: status === 'published' ? now : null }).select('id,status,published_at,updated_at').single()
    if (result.error) throw result.error
    if (!result.data) throw new Error('The article was not created.')
    return result.data
  }
  if (status === 'published') {
    // Set the first-publication date atomically ONLY on an undated row. A
    // competing publisher cannot overwrite the winner's date with a stale one.
    const first = await client.from('blog_posts').update({ ...payload, published_at: now }).eq('id', id).is('published_at', null).select('id,status,published_at,updated_at').maybeSingle()
    if (first.error) throw first.error
    if (first.data) return first.data
    const existing = await client.from('blog_posts').update(payload).eq('id', id).not('published_at', 'is', null).select('id,status,published_at,updated_at').single()
    if (existing.error) throw existing.error
    if (!existing.data) throw new Error('The article was not saved. Reload and try again.')
    return existing.data
  }
  const result = await client.from('blog_posts').update(payload).eq('id', id).select('id,status,published_at,updated_at').single()
  if (result.error) throw result.error
  if (!result.data) throw new Error('The article was not saved. Reload and try again.')
  return result.data
}

export function insightPublicationLabel(value?: string | null) {
  if (!value) return 'Never published'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Publication date unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date) + ' UTC'
}
