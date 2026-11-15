// src/app/api/client-portal/settings/route.ts
//
// GET   — the CALLER's own profile settings, as an allow-list.
// PATCH — update ONLY the fields the portal already lets a client edit.
//
// Replaces the browser-side clients.select('*') and clients.update(...) under RLS. Scope comes from
// the session alone: auth.uid() -> clients row -> clients.id; the update is `.eq('id', <that id>)`,
// never a user id or client id from the body. The request cannot name a column to write: the body
// is validated into a fixed set (name, business, WhatsApp, website, country, and the three
// notification preferences) and everything else is ignored. The avatar URL, when supplied, must be
// one of THIS user's own uploads in the client-portal bucket. Email is never writable.
//
// The avatar bucket (client-portal/profile-images) is PUBLIC today — recorded for the final
// security pass. This route neither migrates it nor loosens it.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { isOwnAvatarUrl, validateSettingsPatch } from '@/lib/client-portal/support-display'

export const dynamic = 'force-dynamic'


const COLUMNS =
  'id, full_name, business_name, email, whatsapp, website_url, country, profile_image, created_at, email_notifications, project_updates, marketing_emails'

function present(row: any) {
  return {
    profile: {
      fullName: row.full_name || '',
      businessName: row.business_name || '',
      email: row.email || '',
      whatsapp: row.whatsapp || '',
      websiteUrl: row.website_url || '',
      country: row.country || '',
      profileImage: typeof row.profile_image === 'string' && /^https:\/\//i.test(row.profile_image) ? row.profile_image : null,
      createdAt: row.created_at || null,
      reference: typeof row.id === 'string' ? row.id.slice(0, 8) : null,
    },
    preferences: {
      emailNotifications: row.email_notifications !== false,
      projectUpdates: row.project_updates !== false,
      marketingEmails: row.marketing_emails === true,
    },
  }
}

async function resolve() {
  // Suspension is enforced by the shared resolver; settings and avatar remain available to an
  // unconnected (not-yet-linked) account, because they describe the account itself.
  const portal = await resolvePortalClient({ extraColumns: COLUMNS, failureMessage: 'Failed to load your settings' })
  if (!portal.ok) return { response: portal.response } as const
  return { user: portal.user, adminClient: portal.db, row: portal.client } as const
}

export async function GET() {
  try {
    const r = await resolve()
    if ('response' in r) return r.response
    return NextResponse.json(present(r.row))
  } catch (error) {
    console.error('❌ Client settings read error:', error)
    return NextResponse.json({ error: 'Failed to load your settings' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const r = await resolve()
    if ('response' in r) return r.response

    const body: any = await request.json().catch(() => null)
    const update: Record<string, unknown> = {}

    // Avatar: only the caller's own uploaded object may become their profile image.
    if (body && typeof body === 'object' && body.profile_image !== undefined) {
      if (!isOwnAvatarUrl(body.profile_image, r.user.id, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
        return NextResponse.json({ error: 'Invalid profile image.' }, { status: 400 })
      }
      update.profile_image = body.profile_image
    }

    const { profile_image: _ignored, ...rest } = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
    if (Object.keys(rest).length > 0 || Object.keys(update).length === 0) {
      const v = validateSettingsPatch(rest)
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
      Object.assign(update, v.patch)
    }

    const { data: updated, error } = await r.adminClient
      .from('clients')
      .update(update)
      .eq('id', r.row.id)
      .select(COLUMNS)
      .maybeSingle()

    if (error || !updated) {
      console.error('[client-portal/settings] update failed')
      return NextResponse.json({ error: 'Failed to update your settings' }, { status: 500 })
    }

    return NextResponse.json(present(updated))
  } catch (error) {
    console.error('❌ Client settings update error:', error)
    return NextResponse.json({ error: 'Failed to update your settings' }, { status: 500 })
  }
}
