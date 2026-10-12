// src/app/api/client-portal/me/route.ts
//
// GET — the minimum the portal shell and the request page need to know about the CALLER's own client
// account: name, business, email and avatar. Replaces the browser-side clients.select('*') in
// PortalAuthGate, which put the whole row in the browser.
//
// Scope: auth.uid() -> clients row (user_id). Nothing comes from the request. An unauthenticated
// caller gets 401; no clients row 404; two rows 409 (refused, never guessed). The response is an
// explicit allow-list — no ids, merchant link, role or preference columns.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function GET() {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: rows, error } = await adminClient
      .from('clients')
      .select('full_name, business_name, email, profile_image')
      .eq('user_id', user.id)
      .limit(2)

    if (error) {
      console.error('[client-portal/me] client lookup failed')
      return NextResponse.json({ error: 'Failed to load your account' }, { status: 500 })
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (rows.length > 1) {
      console.error(`[client-portal/me] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const c = rows[0]
    return NextResponse.json({
      client: {
        full_name: c.full_name || null,
        business_name: c.business_name || null,
        email: c.email || null,
        profile_image: typeof c.profile_image === 'string' && /^https:\/\//i.test(c.profile_image) ? c.profile_image : null,
      },
    })
  } catch (error) {
    console.error('❌ Client me error:', error)
    return NextResponse.json({ error: 'Failed to load your account' }, { status: 500 })
  }
}
