// src/app/api/portal-invitation/accept/route.ts
//
// POST — connect the signed-in account to the merchant the invitation names.
//
// Identity comes ONLY from the session (supabase.auth.getUser()), and the email
// used is the account's VERIFIED auth email. The token comes ONLY from the
// httpOnly cookie set by /api/portal-invitation/open. No merchant id, client id
// or email is accepted from the request body. The link itself is made inside
// consume_portal_invitation(), in one locked transaction.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPrivilegedClient } from '@/lib/admin-api-auth'
import { consumeInvitation, INVITE_COOKIE } from '@/lib/portal-invitations'

export const dynamic = 'force-dynamic'

export async function POST() {
  const token = cookies().get(INVITE_COOKIE)?.value ?? ''
  if (!token) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })

  const session = createServerSupabaseClient()
  const {
    data: { user },
  } = await session.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'sign_in_required' }, { status: 401 })
  if (!user.email || !user.email_confirmed_at) {
    return NextResponse.json({ ok: false, reason: 'email_unverified' }, { status: 403 })
  }

  const db = getPrivilegedClient()
  if (!db) return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })

  const result = await consumeInvitation(db, { token, userId: user.id, verifiedEmail: user.email })
  const response = NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'error' ? 500 : 409 })
  // A finished invitation (linked, or permanently unusable) is cleared; a fixable
  // one (wrong account signed in, account not provisioned yet) is kept.
  if (result.ok || ['invalid', 'expired', 'used', 'client_linked_elsewhere', 'merchant_linked_elsewhere'].includes(result.reason)) {
    response.cookies.delete(INVITE_COOKIE)
  }
  return response
}
