// src/app/api/backup/route.ts
//
// GET — a JSON export of the blog posts, for ACTIVE, 2FA-VERIFIED ADMINS ONLY.
//
// This used to have NO authorization: it read blog_posts with the cookie-session client, i.e. as whoever called it
// (an anonymous caller got the `anon` role, so what leaked depended entirely on blog_posts RLS). It now runs the one
// shared admin gate FIRST (session -> user-bound 2FA cookie -> active admin_users row), before any read, and reads
// with the privileged client that gate returns.
//
// FIELDS. An explicit column list instead of `*`, so a column added to blog_posts later (an author email, an
// internal note, a token) is not exported by accident. These are exactly the content fields the blog admin
// already edits. Nothing here is a credential or a person's contact details.
//
// It is read-only and takes no request input: no table name, filter or column list can come from the caller.
// (The /admin/backup page also posts to this URL for restore/import actions that were never implemented; those
// methods are not implemented here either and answer 405.)

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

const BLOG_POST_BACKUP_COLUMNS =
  'id, title, slug, excerpt, content, featured_image, tags, status, is_featured, is_active, read_time, ' +
  'published_at, updated_at, og_image'

export async function GET() {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const { data: posts, error } = await db.from('blog_posts').select(BLOG_POST_BACKUP_COLUMNS).order('updated_at', { ascending: false }).limit(5000)
    if (error) return queryFailure('blog post backup', error)

    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('[admin-api] backup error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
