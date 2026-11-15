// src/app/api/client-portal/me/route.ts
//
// GET — the minimum the portal shell and the request page need to know about the CALLER's own client
// account: name, business, email, avatar and whether the account is connected yet. Replaces the
// browser-side clients.select('*') in PortalAuthGate, which put the whole row in the browser.
//
// Scope: auth.uid() -> clients row (user_id), resolved by the shared portal resolver. Nothing comes from the
// request. Unauthenticated 401; no clients row 404; two rows 409 (refused, never guessed); a suspended
// account 403 { state: 'suspended' }. The response is an explicit allow-list — no ids, merchant id, role or
// preference columns. `connected` is a plain boolean: it tells the UI whether Hbee has linked this portal
// account to a business yet, and nothing about which one.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const portal = await resolvePortalClient({ extraColumns: 'full_name, business_name, email, profile_image' })
    if (!portal.ok) return portal.response

    const c = portal.client as Record<string, unknown>
    const image = c.profile_image
    return NextResponse.json({
      client: {
        full_name: (c.full_name as string) || null,
        business_name: (c.business_name as string) || null,
        email: (c.email as string) || null,
        profile_image: typeof image === 'string' && /^https:\/\//i.test(image) ? image : null,
        connected: portal.connected,
      },
    })
  } catch (error) {
    console.error('❌ Client me error:', error)
    return NextResponse.json({ error: 'Failed to load your account' }, { status: 500 })
  }
}
